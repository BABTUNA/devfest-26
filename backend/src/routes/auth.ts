import { Router } from 'express';
import { signUp, signIn, getCurrentUser } from '../lib/auth.js';

export const authRouter = Router();

/**
 * POST /api/auth/signup
 * Sign up a new user with email, password, and name.
 */
authRouter.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, password, and name are required',
      });
    }

    const data = await signUp(email, password, name);

    res.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Signup failed',
    });
  }
});

/**
 * POST /api/auth/signin
 * Sign in with email and password.
 */
authRouter.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    const data = await signIn(email, password);

    res.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error('[Auth] Sign in error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Sign in failed',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user.
 */
authRouter.get('/me', async (req, res) => {
  try {
    const user = await getCurrentUser(req);

    res.json({
      user,
    });
  } catch (error) {
    console.error('[Auth] Get current user error:', error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Unauthorized',
    });
  }
});
