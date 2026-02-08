import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(currentDir, '..');
const repoRoot = resolve(backendRoot, '..');

// Prefer backend-specific env files, then allow repo-root env as fallback.
config({ path: resolve(backendRoot, '.env') });
config({ path: resolve(repoRoot, '.env') });
config({ path: resolve(backendRoot, '.env.local'), override: true });
config({ path: resolve(repoRoot, '.env.local'), override: true });
