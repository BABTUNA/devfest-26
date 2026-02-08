export type WorkflowDefinition = Record<string, unknown>;

export type WorkflowRecord = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  includes: string[];
  definition: WorkflowDefinition;
  is_published?: boolean;
  price_in_cents?: number | null;
  flowglad_product_id?: string | null;
  flowglad_price_id?: string | null;
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
  isPublished?: boolean;
  priceInCents?: number | null;
};

export type UpdateWorkflowPatch = {
  name?: string;
  description?: string | null;
  definition?: WorkflowDefinition;
  includes?: string[];
  is_published?: boolean;
  price_in_cents?: number;
};
