# Quick Reference

Common operations and code snippets for the Supabase backend.

## Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your Supabase credentials
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## Start Server

```bash
npm install      # Install dependencies
npm run dev      # Development with hot reload
npm run build    # Build for production
npm start        # Run production build
```

## Test Everything

```bash
npx tsx examples/workflow-example.ts
```

## Common API Calls

### Sign Up

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123","name":"John"}'
```

### Sign In

```bash
curl -X POST http://localhost:4000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'
```

Save the `access_token` from response.

### Create Workflow

```bash
curl -X POST http://localhost:4000/api/workflows \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Workflow","description":"Test"}'
```

### List Workflows

```bash
curl http://localhost:4000/api/workflows \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Workflow with Includes

```bash
curl -X PATCH http://localhost:4000/api/workflows/WORKFLOW_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"includes":["workflow-a-id","workflow-b-id"]}'
```

### Get Profile

```bash
curl http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Profile

```bash
curl -X PATCH http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Name"}'
```

## TypeScript Usage

### Sign Up

```typescript
import { signUp } from './lib/auth.js';

const data = await signUp('user@example.com', 'password123', 'John Doe');
const { user, session } = data;
const accessToken = session.access_token;
```

### Sign In

```typescript
import { signIn } from './lib/auth.js';

const data = await signIn('user@example.com', 'password123');
const accessToken = data.session.access_token;
```

### Create Workflow

```typescript
import { createWorkflow } from './services/workflows.js';

const workflow = await createWorkflow(
  userId,
  'My Workflow',
  'Description',
  { blocks: ['block1', 'block2'] }
);
```

### Update Workflow with Includes

```typescript
import { updateWorkflow } from './services/workflows.js';

const updated = await updateWorkflow(userId, workflowId, {
  includes: [workflowAId, workflowBId],
});
```

### Get User Workflows

```typescript
import { getUserWorkflows } from './services/workflows.js';

const workflows = await getUserWorkflows(userId);
```

## Supabase SQL Queries

### Check Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'workflows');
```

### Check RLS Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### View All Users

```sql
SELECT id, name, created_at 
FROM public.users;
```

### View All Workflows

```sql
SELECT id, name, includes, owner_user_id 
FROM public.workflows;
```

### Find Workflows with Includes

```sql
SELECT name, includes 
FROM public.workflows 
WHERE cardinality(includes) > 0;
```

### Delete Test Data

```sql
-- Delete workflows (cascades from owner)
DELETE FROM public.workflows WHERE owner_user_id = 'USER_ID';

-- Delete user profile (cascades from auth.users)
DELETE FROM auth.users WHERE email = 'test@example.com';
```

## Common Errors & Fixes

### "Missing SUPABASE_URL"
```bash
# Make sure .env exists and has correct values
cat .env | grep SUPABASE
```

### "Invalid or expired token"
```typescript
// Get a fresh token by signing in again
const { session } = await signIn(email, password);
const token = session.access_token;
```

### "Circular dependency detected"
```typescript
// Check your includes structure
// A → B → C → A is NOT allowed
// A → B, A → C is OK
```

### Port 4000 in use
```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Or change port in .env
PORT=4001
```

## File Locations

```
Key Files:
├── src/lib/supabase.ts           # Client + types
├── src/lib/auth.ts               # Auth functions
├── src/services/users.ts         # User operations
├── src/services/workflows.ts     # Workflow operations
├── src/routes/auth.ts            # Auth endpoints
├── src/routes/users.ts           # User endpoints
├── src/routes/workflows.ts       # Workflow endpoints
├── examples/workflow-example.ts  # Complete test
└── .env                          # Your config

Migrations:
├── db/migrations/001_create_users_table.sql
└── db/migrations/002_create_workflows_table.sql

Docs:
├── SETUP_GUIDE.md               # Step-by-step setup
├── SUPABASE_README.md           # Full API reference
└── db/README.md                 # Migration guide
```

## Workflow Include Examples

### Simple Include

```typescript
// Workflow A and B are independent
const workflowA = await createWorkflow(userId, 'A', 'First');
const workflowB = await createWorkflow(userId, 'B', 'Second');

// Workflow C includes both
const workflowC = await createWorkflow(userId, 'C', 'Composite');
await updateWorkflow(userId, workflowC.id, {
  includes: [workflowA.id, workflowB.id],
});
```

### Nested Include (Tree)

```typescript
// A includes nothing
const A = await createWorkflow(userId, 'A', 'Base');

// B includes A
const B = await createWorkflow(userId, 'B', 'Mid');
await updateWorkflow(userId, B.id, { includes: [A.id] });

// C includes B (and transitively A)
const C = await createWorkflow(userId, 'C', 'Top');
await updateWorkflow(userId, C.id, { includes: [B.id] });
```

### Invalid: Circular

```typescript
// This will FAIL with "Circular dependency detected"
await updateWorkflow(userId, workflowA.id, { includes: [workflowB.id] });
await updateWorkflow(userId, workflowB.id, { includes: [workflowA.id] });
// Error: A → B → A is a cycle
```

## Express Middleware

### Protect Route

```typescript
import { requireAuth } from './lib/auth.js';

router.get('/protected', requireAuth, async (req, res) => {
  const userId = (req as any).user.id;
  // User is authenticated
});
```

### Get User ID from Request

```typescript
// After requireAuth middleware
const user = (req as any).user;
const userId = user.id;
const email = user.email;
```

## Database Types

```typescript
// From src/lib/supabase.ts

interface User {
  id: string;
  name: string;
  created_at: string;
}

interface Workflow {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  includes: string[];
  definition: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

## Testing Checklist

- [ ] Run migrations in Supabase SQL Editor
- [ ] Configure .env with credentials
- [ ] Install dependencies: `npm install`
- [ ] Start server: `npm run dev`
- [ ] Run example: `npx tsx examples/workflow-example.ts`
- [ ] Verify all tests pass (✓ symbols)
- [ ] Check database tables in Supabase dashboard
- [ ] Test API with curl or Postman

## Production Checklist

- [ ] Use production Supabase project
- [ ] Use production service role key
- [ ] Set secure FRONTEND_URL
- [ ] Enable HTTPS
- [ ] Set up environment variables on hosting platform
- [ ] Build TypeScript: `npm run build`
- [ ] Deploy dist/ directory
- [ ] Test authentication flow
- [ ] Monitor logs for errors

---

Need help? Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) or [SUPABASE_README.md](./SUPABASE_README.md)
