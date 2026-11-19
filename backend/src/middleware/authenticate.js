/**
 * CivicPulse Authentication Middleware
 *
 * Provides:
 *   authenticateUser    — Reads Bearer token / x-session-token, verifies account status, attaches req.user or returns 401/403
 *   requireRole(...roles) — Middleware that restricts access to specified roles
 *   optionalAuth        — Attaches req.user if token present, never 401s
 */

import { prisma } from '@civiq/db';
import { createHash } from 'crypto';

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function resolveSession(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { include: { profile: true } } },
  });
  if (!session || session.isRevoked || session.expiresAt < new Date()) {
    return null;
  }
  return session;
}

function extractBearerToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  if (typeof req.headers['x-session-token'] === 'string') return req.headers['x-session-token'].trim();
  return null;
}

/**
 * Middleware: Validates session token and attaches req.user
 * Returns 401 if no valid session, 403 if user account is inactive/suspended.
 */
export async function authenticateUser(req, res, next) {
  try {
    const token = extractBearerToken(req);
    const session = await resolveSession(token);
    if (!session) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (session.user.status && session.user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'User account is inactive or suspended.' });
    }
    req.user = {
      id: session.user.id,
      email: session.user.email,
      phone: session.user.phone,
      role: session.user.role,
      name: session.user.profile?.displayName || session.user.name || null,
      sessionId: session.id,
    };
    next();
  } catch (err) {
    console.error('[authenticate]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Middleware factory: Restricts access to users with one of the given roles.
 * Must be used AFTER authenticateUser.
 *
 * @param {...string} roles — Allowed role names
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden. Insufficient role.',
        required: roles,
        current: req.user.role,
      });
    }
    next();
  };
}

/**
 * Middleware: Attaches req.user if token is present and valid.
 * Never rejects the request — allows public routes to optionally use user context.
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (token) {
      const session = await resolveSession(token);
      if (session && (!session.user.status || session.user.status === 'ACTIVE')) {
        req.user = {
          id: session.user.id,
          email: session.user.email,
          phone: session.user.phone,
          role: session.user.role,
          name: session.user.profile?.displayName || session.user.name || null,
          sessionId: session.id,
        };
      }
    }
    next();
  } catch (err) {
    // On error, continue as unauthenticated
    next();
  }
}
