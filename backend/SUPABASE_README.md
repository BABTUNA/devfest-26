# Supabase Backend

A simple, lean backend implementation using Supabase for authentication and database management. This backend supports user profiles and workflow management with includes functionality.

## Features

- **Authentication**: Email/password signup and signin via Supabase Auth
- **User Profiles**: Auto-created profile table linked to auth users
- **Workflows**: CRUD operations for workflows with support for includes
- **Includes Validation**: Prevents circular dependencies and validates ownership
- **Row Level Security**: All database access is protected by RLS policies
- **TypeScript**: Fully typed with clean module structure

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a project at https://supabase.com
2. Copy `.env.example` to `.env`
3. Add your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Database Migrations

Go to your Supabase Dashboard > SQL Editor and run the migrations in order:

1. `db/migrations/001_create_users_table.sql`
2. `db/migrations/002_create_workflows_table.sql`

See [db/README.md](db/README.md) for detailed migration instructions.

### 4. Start the Server

```bash
npm run dev
```

The server will start on http://localhost:4000

### 5. Test the API

Run the example script to test the complete workflow:

```bash
npx tsx examples/workflow-example.ts
```

## Project Structure

```
backend/
├── db/
│   ├── migrations/          # SQL migration files
│   │   ├── 001_create_users_table.sql
│   │   └── 002_create_workflows_table.sql
│   └── README.md           # Migration instructions
├── src/
│   ├── lib/
│   │   ├── supabase.ts     # Supabase client setup
│   │   ├── auth.ts         # Auth functions and middleware
│   │   └── flowglad.ts     # Flowglad integration (existing)
│   ├── services/
│   │   ├── users.ts        # User profile operations
│   │   └── workflows.ts    # Workflow CRUD + validation
│   ├── routes/
│   │   ├── auth.ts         # Auth endpoints
│   │   ├── users.ts        # User profile endpoints
│   │   └── workflows.ts    # Workflow endpoints
│   └── index.ts            # Express app setup
├── examples/
│   └── workflow-example.ts # Complete usage example
├── .env.example            # Environment template
└── package.json
```

## API Reference

### Authentication

#### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Sign In
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Returns session with `access_token` (JWT).

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

### Users

#### Get Profile
```http
GET /api/users/profile
Authorization: Bearer <access_token>
```

#### Update Profile
```http
PATCH /api/users/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Name"
}
```

### Workflows

#### Create Workflow
```http
POST /api/workflows
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My Workflow",
  "description": "Optional description",
  "definition": {
    "blocks": ["block1", "block2"]
  }
}
```

#### List User Workflows
```http
GET /api/workflows
Authorization: Bearer <access_token>
```

#### Get Workflow
```http
GET /api/workflows/:id
Authorization: Bearer <access_token>
```

#### Update Workflow
```http
PATCH /api/workflows/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "includes": ["workflow-id-1", "workflow-id-2"]
}
```

#### Delete Workflow
```http
DELETE /api/workflows/:id
Authorization: Bearer <access_token>
```

## Database Schema

### public.users

User profile table, auto-populated from auth.users on signup.

| Column     | Type        | Description                    |
|------------|-------------|--------------------------------|
| id         | uuid        | Primary key, refs auth.users   |
| name       | text        | User display name              |
| created_at | timestamptz | Account creation timestamp     |

### public.workflows

Workflow management with includes support.

| Column        | Type        | Description                     |
|---------------|-------------|---------------------------------|
| id            | uuid        | Primary key (auto-generated)    |
| owner_user_id | uuid        | References auth.users           |
| name          | text        | Workflow name                   |
| description   | text        | Optional description            |
| includes      | uuid[]      | Array of included workflow IDs  |
| definition    | jsonb       | Workflow graph/definition       |
| created_at    | timestamptz | Creation timestamp              |
| updated_at    | timestamptz | Last update (auto-updated)      |

## Includes Validation

When updating a workflow's `includes` array, the backend validates:

1. **Existence**: All referenced workflows must exist
2. **Ownership**: All included workflows must belong to the same user
3. **No Self-Reference**: A workflow cannot include itself
4. **No Cycles**: Prevents circular dependencies (A → B → C → A)

Cycle detection uses Depth-First Search (DFS) to traverse the workflow graph.

## Security

- **RLS Policies**: All database tables use Row Level Security
- **JWT Authentication**: All protected routes require valid Supabase JWT
- **Owner-Only Access**: Users can only access their own data
- **Service Role**: Backend uses service role key but respects RLS through user context

## Environment Variables

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server Configuration
PORT=4000
FRONTEND_URL=http://localhost:3000

# Demo Mode (optional)
DEMO_MODE=false

# Flowglad (optional, for billing)
FLOWGLAD_SECRET_KEY=sk_test_...

# AI Features (optional)
ANTHROPIC_API_KEY=sk-ant-...
```

## Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Run Production Build
```bash
npm start
```

## Testing

The example script (`examples/workflow-example.ts`) demonstrates:

1. User signup and signin
2. Profile creation (automatic via trigger)
3. Creating workflows
4. Including workflows in other workflows
5. Validation error handling:
   - Circular dependencies
   - Non-existent workflows
   - Self-references
6. Profile updates
7. Workflow deletion

Run with:
```bash
npx tsx examples/workflow-example.ts
```

## Best Practices

1. **Always use JWT**: Pass the access token from signup/signin in the Authorization header
2. **Let RLS do the work**: Database policies enforce access control automatically
3. **Keep it simple**: No unnecessary abstractions or complex patterns
4. **Validate includes**: The backend handles cycle detection and ownership checks
5. **Use service role carefully**: Only for operations that need to bypass RLS

## Troubleshooting

### "Missing SUPABASE_URL" Warning
Make sure your `.env` file contains valid Supabase credentials.

### "Invalid or expired token"
The JWT from signin expires. Get a new token by signing in again.

### "Circular dependency detected"
You're trying to create a cycle in workflow includes. Review your includes structure.

### "Cannot include workflows from other users"
You can only include your own workflows. Check the owner_user_id.

## License

MIT
