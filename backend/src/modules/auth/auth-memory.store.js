/**
 * In-memory Authentication Store for Dev / Offline Resilience.
 * Ensures local development and tests function seamlessly even when
 * remote cloud databases (e.g. Neon PostgreSQL) are temporarily unreachable.
 */

class AuthMemoryStore {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();

    // Pre-seed standard demo accounts
    this.seedUser({
      id: 'usr_citizen_demo',
      email: 'citizen.demo@gmail.com',
      phone: '+919876543210',
      role: 'CITIZEN',
      status: 'ACTIVE',
      name: 'Demo Citizen',
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
    });
  }

  seedUser(userData) {
    const user = {
      id: userData.id,
      email: userData.email || null,
      phone: userData.phone || null,
      role: userData.role || 'CITIZEN',
      status: userData.status || 'ACTIVE',
      name: userData.name || 'Citizen',
      profile: { displayName: userData.name || 'Citizen' },
      phoneVerifiedAt: userData.phoneVerifiedAt || null,
      emailVerifiedAt: userData.emailVerifiedAt || null,
    };
    if (user.id) this.users.set(user.id, user);
    if (user.phone) this.users.set(user.phone, user);
    if (user.email) this.users.set(user.email, user);
    return user;
  }

  findUser(identifier) {
    if (!identifier) return null;
    return this.users.get(identifier) || null;
  }

  saveUser(userData) {
    return this.seedUser(userData);
  }

  saveSession(tokenHash, { userId, user }) {
    const session = {
      id: `sess_${tokenHash.slice(0, 12)}`,
      userId,
      tokenHash,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      user: user || this.findUser(userId),
    };
    this.sessions.set(tokenHash, session);
    return session;
  }

  findSession(tokenHash) {
    const session = this.sessions.get(tokenHash);
    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      return null;
    }
    return session;
  }

  revokeSession(tokenHash) {
    const session = this.sessions.get(tokenHash);
    if (session) {
      session.isRevoked = true;
      return true;
    }
    return false;
  }
}

export const authMemoryStore = new AuthMemoryStore();
