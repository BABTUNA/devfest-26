import type { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: User;
      authUserId?: string;
    }
  }
}

/**
 * Sign up a new user with email and password.
 * User metadata (name) is passed and will be available in the trigger.
 */
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    throw new Error(`Signup failed: ${error.message}`);
  }

  return data;
}

/**
 * Sign in with email and password.
 * Returns session with JWT access token.
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Sign in failed: ${error.message}`);
  }

  return data;
}

/**
 * Get current user from JWT token in Authorization header.
 * Validates the token with Supabase and returns user data.
 */
export async function getCurrentUser(req: Request) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  return user;
}

/**
 * Express middleware to require authentication.
 * Validates JWT and attaches user to req.user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getCurrentUser(req);
    req.authUser = user;
    req.authUserId = user.id;
    next();
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Unauthorized',
    });
  }
}

/**
 * Extract access token from Authorization header.
 */
export function getAccessToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

/**
 * Get customer external ID from request for Flowglad integration.
 * This uses the authenticated user's ID as the customer external ID.
 * Falls back to demo user ID if no auth header is present (for demo mode).
 */
export async function getCustomerExternalId(req: Request): Promise<string> {
  const DEMO_USER_ID = 'demo-user-1';

  if (req.authUserId) {
    return req.authUserId;
  }
  
  try {
    const user = await getCurrentUser(req);
    return user.id;
  } catch {
    // If authentication fails (e.g., in demo mode or missing token),
    // fall back to demo user ID
    return DEMO_USER_ID;
  }
}
