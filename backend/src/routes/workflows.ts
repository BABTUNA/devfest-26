import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import {
  createWorkflow,
  listWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  WorkflowNotFoundError,
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
    const { name, description, definition } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Workflow name is required',
      });
    }

    const workflow = await createWorkflow(userId, name, description, definition);

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
    res.json(result);
  } catch (error) {
    console.error('[Workflows] List error:', error);
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
    const workflow = await getWorkflowById(workflowId);

    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
      });
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
    const updates = req.body;

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
