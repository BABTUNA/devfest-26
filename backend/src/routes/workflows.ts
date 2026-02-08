import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import {
  createWorkflow,
  getUserWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
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
 * Get all workflows for current user.
 */
workflowsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const workflows = await getUserWorkflows(userId);

    res.json(workflows);
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
    const userId = req.authUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const workflowId = String(req.params.id);

    const workflow = await getWorkflow(userId, workflowId);

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
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete workflow',
    });
  }
});
