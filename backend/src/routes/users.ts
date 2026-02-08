import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { getCurrentUserProfile, updateProfile } from '../services/users.js';

export const usersRouter = Router();

/**
 * GET /api/users/profile
 * Get current user's profile.
 */
usersRouter.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const profile = await getCurrentUserProfile(userId);

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
      });
    }

    res.json(profile);
  } catch (error) {
    console.error('[Users] Get profile error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch profile',
    });
  }
});

/**
 * PATCH /api/users/profile
 * Update current user's profile.
 */
usersRouter.patch('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Name is required',
      });
    }

    const profile = await updateProfile(userId, { name });

    res.json(profile);
  } catch (error) {
    console.error('[Users] Update profile error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update profile',
    });
  }
});
