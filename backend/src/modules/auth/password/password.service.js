import { prisma } from '@civiq/db';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';
import { authMemoryStore } from '../auth-memory.store.js';

const SESSION_EXPIRY_DAYS = 30;
const RESET_TOKEN_EXPIRY_HOURS = 1;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export class PasswordAuthService {
    /**
     * Generates a securely hashed version of a password using scrypt.
     */
    hashPassword(password) {
        const salt = randomBytes(16).toString('hex');
        const derivedKey = scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${derivedKey}`;
    }

    /**
     * Verifies a candidate password against an scrypt salt:hash string.
     */
    verifyPassword(candidate, storedHash) {
        try {
            const [salt, key] = storedHash.split(':');
            if (!salt || !key) return false;
            const keyBuffer = Buffer.from(key, 'hex');
            const derivedBuffer = scryptSync(candidate, salt, 64);
            return timingSafeEqual(keyBuffer, derivedBuffer);
        } catch {
            return false;
        }
    }

    /**
     * Generates a random session or reset token.
     */
    generateSessionToken() {
        return randomBytes(32).toString('hex');
    }

    hashString(value) {
        return createHash('sha256').update(value).digest('hex');
    }

    /**
     * Register a new user with email and password.
     */
    async register(email, password) {
        const normalizedEmail = email.toLowerCase().trim();
        try {
            const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
            if (existing) {
                return { success: false, error: 'Registration failed.' };
            }
            await prisma.user.create({
                data: {
                    email: normalizedEmail,
                    passwordHash: this.hashPassword(password),
                }
            });
            return { success: true };
        } catch {
            // Memory store fallback
            const memUser = authMemoryStore.findUser(normalizedEmail);
            if (memUser) {
                return { success: false, error: 'Registration failed.' };
            }
            authMemoryStore.saveUser({
                id: `usr_${Date.now()}`,
                email: normalizedEmail,
                role: 'CITIZEN',
                password,
            });
            return { success: true };
        }
    }

    /**
     * Login with email and password.
     */
    async login(email, password) {
        const normalizedEmail = email.toLowerCase().trim();
        const genericError = 'Invalid email or password.';

        let user = null;
        let isDbAvailable = true;

        try {
            user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        } catch {
            isDbAvailable = false;
        }

        // Check in-memory store if DB is offline or user not found in DB
        if (!user) {
            const memUser = authMemoryStore.findUser(normalizedEmail);
            if (memUser && memUser.password) {
                if (memUser.password !== password && !this.verifyPassword(password, memUser.password)) {
                    return { success: false, error: genericError };
                }
                const sessionToken = this.generateSessionToken();
                const tokenHash = this.hashString(sessionToken);
                authMemoryStore.saveSession(tokenHash, { userId: memUser.id, user: memUser });
                return { success: true, sessionToken, user: memUser };
            }
            return { success: false, error: genericError };
        }

        if (!user.passwordHash) {
            return { success: false, error: genericError };
        }
        if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
            return { success: false, error: 'Account is suspended or banned.' };
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            return { success: false, error: 'Account is temporarily locked due to too many failed attempts.' };
        }

        const isValid = this.verifyPassword(password, user.passwordHash);
        if (!isValid) {
            if (isDbAvailable) {
                try {
                    const attempts = user.failedLoginAttempts + 1;
                    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { failedLoginAttempts: attempts, lockedUntil },
                    });
                } catch {}
            }
            return { success: false, error: genericError };
        }

        if (isDbAvailable && (user.failedLoginAttempts > 0 || user.lockedUntil)) {
            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { failedLoginAttempts: 0, lockedUntil: null },
                });
            } catch {}
        }

        const sessionToken = this.generateSessionToken();
        const tokenHash = this.hashString(sessionToken);

        if (isDbAvailable) {
            try {
                await prisma.session.create({
                    data: {
                        userId: user.id,
                        tokenHash,
                        expiresAt: new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
                    }
                });
            } catch {
                authMemoryStore.saveSession(tokenHash, { userId: user.id, user });
            }
        } else {
            authMemoryStore.saveSession(tokenHash, { userId: user.id, user });
        }

        return { success: true, sessionToken, user };
    }

    /**
     * Request a password reset email.
     */
    async requestPasswordReset(email) {
        const normalizedEmail = email.toLowerCase().trim();
        try {
            const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
            if (!user) {
                return { success: true };
            }
            const resetToken = this.generateSessionToken();
            const tokenHash = this.hashString(resetToken);
            await prisma.passwordResetToken.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
                }
            });
            return { success: true, resetToken };
        } catch {
            return { success: true };
        }
    }

    /**
     * Complete a password reset.
     */
    async resetPassword(token, newPassword) {
        try {
            const tokenHash = this.hashString(token);
            const resetRequest = await prisma.passwordResetToken.findUnique({
                where: { tokenHash }
            });
            if (!resetRequest || resetRequest.usedAt || resetRequest.expiresAt < new Date()) {
                return { success: false, error: 'Invalid or expired reset token.' };
            }
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: resetRequest.userId },
                    data: {
                        passwordHash: this.hashPassword(newPassword),
                        failedLoginAttempts: 0,
                        lockedUntil: null,
                    }
                }),
                prisma.passwordResetToken.update({
                    where: { id: resetRequest.id },
                    data: { usedAt: new Date() }
                })
            ]);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}

export const passwordAuthService = new PasswordAuthService();
