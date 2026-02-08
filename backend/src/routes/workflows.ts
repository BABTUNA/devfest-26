import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import {
  createWorkflow,
  listWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  WorkflowNotFoundError,
  checkWorkflowAccess,
} from '../services/workflows.js';

export const workflowsRouter = Router();

/**
 * POST /api/workflows
 * Create a new workflow.
 */
workflowsRouter.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const {
      name,
      description,
      definition,
    } = req.body as {
      name?: string;
      description?: string;
      definition?: Record<string, unknown>;
    };

    if (!name) {
      return res.status(400).json({
        error: 'Workflow name is required',
      });
    }

    const workflow = await createWorkflow(
      userId,
      name,
      description,
      definition
    );

    res.status(201).json(workflow);
  } catch (error) {
    console.error('[Workflows] Create error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create workflow',
    });
  }
});

/**
 * GET /api/workflows
 * List marketplace workflows.
 */
workflowsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const limitRaw = req.query.limit;
    const cursorRaw = req.query.cursor;
    const parsedLimit = Number.parseInt(String(limitRaw ?? ''), 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
    const cursor = typeof cursorRaw === 'string' && cursorRaw.trim() ? cursorRaw : undefined;

    const result = await listWorkflows({ limit, cursor });

    // Strip sensitive definition data for list view
    result.workflows.forEach((w) => {
      w.definition = {};
    });

    res.json(result);
  } catch (error) {
    console.error('[Workflows] List error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch workflows',
    });
  }
});

/**
 * GET /api/workflows/accessible
 * Get workflows the user owns or has purchased (paid status only).
 * This is the source of truth for which workflow agents a user can add to the Lab.
 */
workflowsRouter.get('/accessible', requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { supabase } = await import('../lib/supabase.js');

    // Get workflows the user owns
    const { data: ownedWorkflows, error: ownedError } = await supabase
      .from('workflows')
      .select('*')
      .eq('owner_user_id', userId)
      .order('updated_at', { ascending: false });

    if (ownedError) {
      throw ownedError;
    }

    // Get workflow IDs the user has purchased (status: paid)
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('workflow_id')
      .eq('buyer_user_id', userId)
      .eq('status', 'paid');

    if (purchasesError) {
      throw purchasesError;
    }

    const purchasedWorkflowIds = purchases?.map(p => p.workflow_id) || [];

    // Get purchased workflows (exclude already owned to prevent duplicates)
    let purchasedWorkflows: any[] = [];
    if (purchasedWorkflowIds.length > 0) {
      const ownedIds = new Set((ownedWorkflows || []).map(w => w.id));
      const uniquePurchasedIds = purchasedWorkflowIds.filter(id => !ownedIds.has(id));

      if (uniquePurchasedIds.length > 0) {
        const { data, error } = await supabase
          .from('workflows')
          .select('*')
          .in('id', uniquePurchasedIds)
          .order('updated_at', { ascending: false });

        if (error) {
          throw error;
        }
        purchasedWorkflows = data || [];
      }
    }

    // Combine: owned workflows first, then purchased
    const allWorkflows = [...(ownedWorkflows || []), ...purchasedWorkflows];

    res.json(allWorkflows);
  } catch (error) {
    console.error('[Workflows] Get my workflows error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch workflows',
    });
  }
});

/**
 * GET /api/workflows/:id
 * Get a specific workflow.
 */
workflowsRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const workflowId = String(req.params.id);
    const userId = req.authUserId; // Guaranteed by requireAuth

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workflow = await getWorkflowById(workflowId);

    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
      });
    }

    // Check access to determine if we should return the full definition
    const hasAccess = await checkWorkflowAccess(userId, workflowId);
    if (!hasAccess) {
      workflow.definition = {};
    }

    res.json(workflow);
  } catch (error) {
    console.error('[Workflows] Get error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch workflow',
    });
  }
});

/**
 * PATCH /api/workflows/:id
 * Update a workflow.
 */
workflowsRouter.patch('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const workflowId = String(req.params.id);
    const body = req.body as Record<string, unknown>;
    const updates: {
      name?: string;
      description?: string;
      definition?: Record<string, unknown>;
      includes?: string[];
    } = {};

    if (typeof body.name === 'string') updates.name = body.name;
    if (typeof body.description === 'string') updates.description = body.description;
    if (typeof body.definition === 'object' && body.definition !== null) {
      updates.definition = body.definition as Record<string, unknown>;
    }
    if (Array.isArray(body.includes)) {
      updates.includes = body.includes.filter((value): value is string => typeof value === 'string');
    }

    const workflow = await updateWorkflow(userId, workflowId, updates);

    res.json(workflow);
  } catch (error) {
    console.error('[Workflows] Update error:', error);
    if (error instanceof WorkflowNotFoundError) {
      return res.status(404).json({
        error: error.message,
      });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update workflow',
    });
  }
});

/**
 * DELETE /api/workflows/:id
 * Delete a workflow.
 */
workflowsRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const workflowId = String(req.params.id);

    await deleteWorkflow(userId, workflowId);

    res.status(204).send();
  } catch (error) {
    console.error('[Workflows] Delete error:', error);
    if (error instanceof WorkflowNotFoundError) {
      return res.status(404).json({
        error: error.message,
      });
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete workflow',
    });
  }
});
