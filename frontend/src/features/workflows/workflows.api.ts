import { apiFetch } from '@/lib/api';
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

  return apiFetch<WorkflowRecord>('/api/workflows', {
    method: 'POST',
    body: {
      name,
      description,
      definition,
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
