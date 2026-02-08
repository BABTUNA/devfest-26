export type WorkflowDefinition = Record<string, unknown>;

export type WorkflowRecord = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  includes: string[];
  definition: WorkflowDefinition;
  created_at: string;
  updated_at: string;
};

export type ListWorkflowsParams = {
  limit?: number;
  cursor?: string;
};

export type ListWorkflowsResult = {
  workflows: WorkflowRecord[];
  nextCursor: string | null;
};

export type CreateWorkflowInput = {
  name: string;
  description?: string;
  definition?: WorkflowDefinition;
};

export type UpdateWorkflowPatch = {
  name?: string;
  description?: string | null;
  definition?: WorkflowDefinition;
  includes?: string[];
};
