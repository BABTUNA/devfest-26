import { supabase, Workflow } from '../lib/supabase.js';
import { canAccessWorkflow, hasPaidWorkflowPurchase } from './purchases.js';

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

const FLOWGLAD_API_URL = 'https://app.flowglad.com/api/v1';
const FLOWGLAD_SECRET_KEY = process.env.FLOWGLAD_SECRET_KEY;
const PRICING_MODEL_ID = process.env.FLOWGLAD_PRICING_MODEL_ID || 'pricing_model_fDYzbCCeVKczlBpCLDEPC';

export class WorkflowNotFoundError extends Error {
  constructor(message = 'Workflow not found') {
    super(message);
    this.name = 'WorkflowNotFoundError';
  }
}

export type ListWorkflowsOptions = {
  limit?: number;
  cursor?: string;
};

export type ListWorkflowsResult = {
  workflows: Workflow[];
  nextCursor: string | null;
};

// Commerce columns (is_published, price_in_cents, flowglad_product_id, flowglad_price_id)
// are not part of the current schema. Commerce features are disabled.

function normalizeLimit(limit?: number): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_LIST_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(limit as number), 1), MAX_LIST_LIMIT);
}

/**
 * List workflows for the marketplace, newest first.
 * Cursor is the previous page's last updated_at value.
 * Note: Filtering by flowglad_price_id requires migration 003 to be run.
 * For now, returns all workflows.
 */
export async function listWorkflows(options: ListWorkflowsOptions = {}): Promise<ListWorkflowsResult> {
  const limit = normalizeLimit(options.limit);

  let query = supabase
    .from('workflows')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt('updated_at', options.cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Workflows] Error listing workflows:', error);
    throw new Error(`Failed to list workflows: ${error.message}`);
  }

  const rows = data || [];
  const hasMore = rows.length > limit;
  const workflows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && workflows.length > 0 ? workflows[workflows.length - 1].updated_at : null;

  return {
    workflows,
    nextCursor,
  };
}

/**
 * Flowglad sync disabled - commerce columns not in schema
 */
async function syncWorkflowToFlowglad(workflow: Workflow): Promise<void> {
  console.log('[Workflows] Flowglad sync skipped - commerce columns not available');
  return;

  try {
    const slug = `workflow_${workflow.id}`;
    const name = workflow.name;
    const priceInCents = workflow.price_in_cents || 500; // Default $5

    console.log(`[Workflows] Syncing workflow ${workflow.id} to Flowglad...`);

    const flowgladPayload = {
      product: {
        name,
        slug,
        description: workflow.description || '',
        pricingModelId: PRICING_MODEL_ID,
        active: true,
        default: false,
      },
      price: {
        type: 'single_payment',
        name: `${name} Price`,
        slug: slug,
        unitPrice: priceInCents,
        active: true,
        isDefault: true,
      },
      featureIds: [],
    };

    const flowgladRes = await fetch(`${FLOWGLAD_API_URL}/products`, {
      method: 'POST',
      headers: {
        'Authorization': FLOWGLAD_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flowgladPayload),
    });

    if (!flowgladRes.ok) {
      // Check if it already exists (conflict)
      if (flowgladRes.status === 409 || flowgladRes.status === 400) {
        console.warn(`[Workflows] Product might already exist for ${slug}. Checking...`);
        // Fetch existing to get ID? For now, just log and skip update
        // Ideally we fetch it by slug and update our DB
        const getRes = await fetch(`${FLOWGLAD_API_URL}/products?slug=${slug}`, {
          headers: { 'Authorization': FLOWGLAD_SECRET_KEY }
        });
        if (getRes.ok) {
          const data = await getRes.json() as any;
          const existing = data.products?.find((p: any) => p.slug === slug);
          if (existing) {
            console.log(`[Workflows] Found existing product ${existing.id}, linking...`);
            const existingPriceSlug =
              normalizePriceSlug(existing.defaultPrice?.slug) ??
              normalizePriceSlug(existing.defaultPrice?.id) ??
              slug;
            await supabase
              .from('workflows')
              .update({
                flowglad_product_id: existing.id,
                flowglad_price_id: existingPriceSlug
              })
              .eq('id', workflow.id);
            return;
          }
        }
      }
      const text = await flowgladRes.text();
      throw new Error(`Failed to create product in Flowglad: ${flowgladRes.status} ${text}`);
    }

    const responseData = await flowgladRes.json() as any;
    const product = responseData.product;
    const price = responseData.price || product.defaultPrice;

    if (product && price) {
      const mappedPriceSlug = normalizePriceSlug(price.slug) ?? normalizePriceSlug(price.id) ?? slug;
      await supabase
        .from('workflows')
        .update({
          flowglad_product_id: product.id,
          flowglad_price_id: mappedPriceSlug
        })
        .eq('id', workflow.id);
      console.log(`[Workflows] Synced workflow ${workflow.id} -> Product ${product.id}`);
      return;
    }

    throw new Error('Flowglad product sync did not return a default price mapping');

  } catch (err) {
    console.error('[Workflows] Error syncing to Flowglad:', err);
    throw err instanceof Error ? err : new Error('Unknown Flowglad sync error');
  }
}

/**
 * Create a new workflow.
 * 
 * @param userId - The owner user ID
 * @param name - Workflow name
 * @param description - Optional workflow description
 * @param definition - Optional workflow definition (JSONB)
 * @param isPublished - Whether to publish to marketplace
 */
export async function createWorkflow(
  userId: string,
  name: string,
  description?: string,
  definition?: Record<string, any>
): Promise<Workflow> {
  const { data, error } = await supabase
    .from('workflows')
    .insert({
      owner_user_id: userId,
      name,
      description: description || null,
      definition: definition || {},
      includes: []
    })
    .select()
    .single();

  if (error) {
    console.error('[Workflows] Error creating workflow:', error);
    throw new Error(`Failed to create workflow: ${error.message}`);
  }

  return data;
}

/**
 * Get all workflows owned by a user.
 * 
 * @param userId - The owner user ID
 */
export async function getUserWorkflows(userId: string): Promise<Workflow[]> {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Workflows] Error fetching workflows:', error);
    throw new Error(`Failed to fetch workflows: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a specific workflow by ID.
 * Validates that the workflow belongs to the user.
 * 
 * @param userId - The owner user ID
 * @param workflowId - The workflow ID
 */
export async function getWorkflow(
  userId: string,
  workflowId: string
): Promise<Workflow | null> {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('owner_user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('[Workflows] Error fetching workflow:', error);
    throw new Error(`Failed to fetch workflow: ${error.message}`);
  }

  return data;
}

/**
 * Get a workflow by ID for marketplace read access.
 */
export async function getWorkflowById(workflowId: string): Promise<Workflow | null> {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .maybeSingle();

  if (error) {
    console.error('[Workflows] Error fetching workflow by id:', error);
    throw new Error(`Failed to fetch workflow: ${error.message}`);
  }

  return data;
}

export async function getWorkflowsByIds(workflowIds: string[]): Promise<Workflow[]> {
  if (workflowIds.length === 0) return [];

  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .in('id', workflowIds);

  if (error) {
    console.error('[Workflows] Error fetching workflows by ids:', error);
    throw new Error(`Failed to fetch workflow includes: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Update a workflow.
 * Validates includes array before saving.
 * 
 * @param userId - The owner user ID
 * @param workflowId - The workflow ID
 * @param updates - Fields to update
 */
export async function updateWorkflow(
  userId: string,
  workflowId: string,
  updates: {
    name?: string;
    description?: string;
    definition?: Record<string, any>;
    includes?: string[];
  }
): Promise<Workflow> {
  // If includes are being updated, validate them
  if (updates.includes) {
    await validateIncludes(userId, updates.includes, workflowId);
  }

  const { data, error } = await supabase
    .from('workflows')
    .update(updates)
    .eq('id', workflowId)
    .eq('owner_user_id', userId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[Workflows] Error updating workflow:', error);
    throw new Error(`Failed to update workflow: ${error.message}`);
  }

  if (!data) {
    throw new WorkflowNotFoundError('Workflow not found or not owned by user');
  }

  return data;
}

/**
 * Delete a workflow.
 * 
 * @param userId - The owner user ID
 * @param workflowId - The workflow ID
 */
export async function deleteWorkflow(
  userId: string,
  workflowId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', workflowId)
    .eq('owner_user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[Workflows] Error deleting workflow:', error);
    throw new Error(`Failed to delete workflow: ${error.message}`);
  }

  if (!data) {
    throw new WorkflowNotFoundError('Workflow not found or not owned by user');
  }
}

/**
 * Validate includes array.
 * Ensures:
 * 1. All included workflows exist
 * 2. All included workflows belong to the same user
 * 3. No circular dependencies (A includes B includes A)
 * 
 * @param userId - The owner user ID
 * @param includes - Array of workflow IDs to include
 * @param currentWorkflowId - The workflow being updated (to prevent self-reference)
 */
async function validateIncludes(
  userId: string,
  includes: string[],
  currentWorkflowId?: string
): Promise<void> {
  if (!includes || includes.length === 0) {
    return;
  }

  // Check for self-reference
  if (currentWorkflowId && includes.includes(currentWorkflowId)) {
    throw new Error('Workflow cannot include itself');
  }

  // Fetch all included workflows
  const { data: includedWorkflows, error } = await supabase
    .from('workflows')
    .select('id, owner_user_id, includes')
    .in('id', includes);

  if (error) {
    throw new Error(`Failed to validate includes: ${error.message}`);
  }

  // Check all workflows exist
  if (!includedWorkflows || includedWorkflows.length !== includes.length) {
    throw new Error('One or more included workflows do not exist');
  }

  // Check all workflows belong to the same user
  const wrongOwner = includedWorkflows.find((w) => w.owner_user_id !== userId);
  if (wrongOwner) {
    throw new Error('Cannot include workflows from other users');
  }

  // Check for cycles
  if (currentWorkflowId) {
    await checkForCycles(userId, currentWorkflowId, includes);
  }
}

/**
 * Check for circular dependencies using DFS.
 * Detects cycles like A → B → C → A.
 * 
 * @param userId - The owner user ID
 * @param startWorkflowId - The workflow being updated
 * @param newIncludes - The new includes array
 */
async function checkForCycles(
  userId: string,
  startWorkflowId: string,
  newIncludes: string[]
): Promise<void> {
  // Fetch all user workflows to build dependency graph
  const workflows = await getUserWorkflows(userId);

  // Build adjacency map
  const graph = new Map<string, string[]>();
  workflows.forEach((w) => {
    graph.set(w.id, w.includes || []);
  });

  // Temporarily update the graph with new includes
  graph.set(startWorkflowId, newIncludes);

  // DFS to detect cycles
  const visited = new Set<string>();
  const inPath = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (inPath.has(nodeId)) {
      return true; // Cycle detected
    }
    if (visited.has(nodeId)) {
      return false; // Already checked
    }

    visited.add(nodeId);
    inPath.add(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) {
        return true;
      }
    }

    inPath.delete(nodeId);
    return false;
  }

  if (dfs(startWorkflowId)) {
    throw new Error('Circular dependency detected in workflow includes');
  }
}

/**
 * Check if a user has access to a workflow.
 * Access is granted if:
 * 1. User is the owner
 * 2. User has a confirmed 'paid' purchase for the workflow
 */
export async function checkWorkflowAccess(userId: string, workflowId: string): Promise<boolean> {
  // 1. Check if owner
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) return false;

  // 2. Check if purchased (paid)
  const hasPaidPurchase = await hasPaidWorkflowPurchase(userId, workflowId);

  return canAccessWorkflow({
    workflowOwnerUserId: workflow.owner_user_id,
    requesterUserId: userId,
    hasPaidPurchase,
  });
}
