import { apiFetch } from '@/lib/api';
import type { BlockDefinition, BlockId } from 'shared';
import type {
  CreateWorkflowInput,
  ListWorkflowsParams,
  ListWorkflowsResult,
  UpdateWorkflowPatch,
  WorkflowRecord,
} from './workflows.types';

function requireSessionUserId(sessionUserId: string | null | undefined, action: string): void {
  if (!sessionUserId) {
    throw new Error(`${action} requires login`);
  }
}

function normalizeId(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

type ListWorkflowsResponse = {
  workflows?: WorkflowRecord[];
  nextCursor?: string | null;
};

export async function listWorkflows(params: ListWorkflowsParams = {}): Promise<ListWorkflowsResult> {
  const searchParams = new URLSearchParams();

  if (typeof params.limit === 'number') {
    searchParams.set('limit', String(params.limit));
  }
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }

  const query = searchParams.toString();
  const path = query ? `/api/workflows?${query}` : '/api/workflows';
  const data = await apiFetch<ListWorkflowsResponse>(path);

  return {
    workflows: data.workflows ?? [],
    nextCursor: data.nextCursor ?? null,
  };
}

export async function getWorkflowById(id: string): Promise<WorkflowRecord> {
  const workflowId = normalizeId(id, 'Workflow id');
  return apiFetch<WorkflowRecord>(`/api/workflows/${workflowId}`);
}

export async function createWorkflow(
  input: CreateWorkflowInput,
  sessionUserId: string | null | undefined
): Promise<WorkflowRecord> {
  requireSessionUserId(sessionUserId, 'Creating a workflow');

  const name = normalizeId(input.name, 'Workflow name');
  const description = input.description?.trim() || undefined;
  const definition = input.definition ?? {};
  const isPublished = input.isPublished === true;
  const priceInCents =
    typeof input.priceInCents === 'number' && Number.isFinite(input.priceInCents)
      ? Math.max(0, Math.trunc(input.priceInCents))
      : undefined;

  return apiFetch<WorkflowRecord>('/api/workflows', {
    method: 'POST',
    body: {
      name,
      description,
      definition,
      isPublished,
      priceInCents,
    },
  });
}

export async function updateWorkflow(
  id: string,
  patch: UpdateWorkflowPatch,
  sessionUserId: string | null | undefined
): Promise<WorkflowRecord> {
  requireSessionUserId(sessionUserId, 'Updating a workflow');
  const workflowId = normalizeId(id, 'Workflow id');

  const body: UpdateWorkflowPatch = {};

  if (patch.name !== undefined) {
    body.name = normalizeId(patch.name, 'Workflow name');
  }
  if (patch.description !== undefined) {
    body.description = patch.description === null ? null : patch.description.trim() || null;
  }
  if (patch.definition !== undefined) {
    body.definition = patch.definition;
  }
  if (patch.includes !== undefined) {
    body.includes = patch.includes;
  }
  if (patch.is_published !== undefined) {
    body.is_published = patch.is_published;
  }
  if (patch.price_in_cents !== undefined) {
    body.price_in_cents = Math.max(0, Math.trunc(patch.price_in_cents));
  }

  return apiFetch<WorkflowRecord>(`/api/workflows/${workflowId}`, {
    method: 'PATCH',
    body,
  });
}

export async function deleteWorkflow(id: string, sessionUserId: string | null | undefined): Promise<void> {
  requireSessionUserId(sessionUserId, 'Deleting a workflow');
  const workflowId = normalizeId(id, 'Workflow id');

  await apiFetch<unknown>(`/api/workflows/${workflowId}`, {
    method: 'DELETE',
  });
}

/**
 * Get workflows the user owns or has purchased (accessible workflows).
 * Returns workflows where the user is the owner OR has a paid purchase.
 */
export async function getMyWorkflows(): Promise<WorkflowRecord[]> {
  return apiFetch<WorkflowRecord[]>('/api/workflows/accessible');
}

/**
 * Convert a WorkflowRecord to a BlockDefinition for use in the block palette.
 * Workflows become agents with their own inputs/outputs derived from the definition.
 */
export function workflowToBlockDefinition(workflow: WorkflowRecord): BlockDefinition {
  const workflowFeatureSlug = `workflow_${workflow.id}`;
  const workflowPriceSlug = workflow.flowglad_price_id || workflowFeatureSlug;

  // Derive inputs and outputs from workflow definition
  // For now, we use generic input/output; in future could parse workflow graph
  const inputs = deriveWorkflowInputs(workflow.definition);
  const outputs = deriveWorkflowOutputs(workflow.definition);

  return {
    id: workflowFeatureSlug as BlockId,
    name: workflow.name,
    description: workflow.description || 'User-created workflow agent',
    icon: 'Sparkles', // Could be customizable in future
    featureSlug: workflowFeatureSlug,
    priceSlug: workflowPriceSlug,
    usesAI: true,
    tokenCost: 0, // No token cost for purchased workflows
    inputs,
    outputs,
  };
}

/**
 * Derive workflow inputs from its definition.
 * This looks for entry-point nodes (nodes with no incoming edges).
 * For MVP, returns a generic input.
 */
function deriveWorkflowInputs(definition: Record<string, unknown>): BlockDefinition['inputs'] {
  // TODO: Parse definition.nodes and definition.edges to find entry points
  // For now, return a generic input
  return [{ key: 'input', label: 'Input', type: 'text', required: true }];
}

/**
 * Derive workflow outputs from its definition.
 * This looks for exit-point nodes (nodes with no outgoing edges).
 * For MVP, returns a generic output.
 */
function deriveWorkflowOutputs(definition: Record<string, unknown>): BlockDefinition['outputs'] {
  // TODO: Parse definition.nodes and definition.edges to find exit points
  // For now, return a generic output
  return [{ key: 'output', label: 'Output' }];
}
