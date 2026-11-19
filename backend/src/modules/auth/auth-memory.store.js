/**
 * In-memory Authentication Store for Dev / Offline Resilience.
 * Ensures local development, Vercel preview, and tests function seamlessly even when
 * remote cloud databases (e.g. Neon PostgreSQL) are temporarily unreachable or paused.
 */

class AuthMemoryStore {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();

    // Pre-seed standard demo accounts with default passwords
    this.seedUser({
      id: 'usr_admin_demo',
      email: 'admin@civiq.dev',
      role: 'PLATFORM_SUPER_ADMIN',
      status: 'ACTIVE',
      name: 'CivicPulse Admin',
      password: 'Admin@123456',
    });
    this.seedUser({
      id: 'usr_officer_demo',
      email: 'officer@pune.gov.in',
      role: 'DEPARTMENT_OFFICER',
      status: 'ACTIVE',
      name: 'Officer Rajesh Patil',
      password: 'Officer@123456',
    });
    this.seedUser({
      id: 'usr_verify_demo',
      email: 'verify@pune.gov.in',
      role: 'VERIFICATION_OFFICER',
      status: 'ACTIVE',
      name: 'Verification Officer Sunita Roy',
      password: 'Verify@123456',
    });
    this.seedUser({
      id: 'usr_worker_demo',
      email: 'worker@pune.gov.in',
      role: 'FIELD_WORKER',
      status: 'ACTIVE',
      name: 'Field Worker Ramesh Kadam',
      password: 'Worker@123456',
    });
    this.seedUser({
      id: 'usr_disaster_demo',
      email: 'disaster@pune.gov.in',
      role: 'DISASTER_COORDINATOR',
      status: 'ACTIVE',
      name: 'Disaster Commander Deshmukh',
      password: 'Disaster@123456',
    });
    this.seedUser({
      id: 'usr_citizen_demo',
      email: 'citizen@civiq.dev',
      phone: '+919876543210',
      role: 'CITIZEN',
      status: 'ACTIVE',
      name: 'Priya Sharma',
      password: 'Citizen@123456',
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
    });
  }

  seedUser(userData) {
    const user = {
      id: userData.id,
      email: userData.email ? userData.email.toLowerCase().trim() : null,
      phone: userData.phone || null,
      role: userData.role || 'CITIZEN',
      status: userData.status || 'ACTIVE',
      name: userData.name || 'Citizen',
      password: userData.password || null,
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
    return this.users.get(identifier) || this.users.get(String(identifier).toLowerCase().trim()) || null;
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
