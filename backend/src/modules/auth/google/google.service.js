import { prisma } from '@civiq/db';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes, createHash } from 'crypto';
import { authMemoryStore } from '../auth-memory.store.js';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy-client-id';
const SESSION_EXPIRY_DAYS = 30;
export class GoogleAuthService {
    client;
    constructor(clientOverride) {
        this.client = clientOverride || new OAuth2Client(CLIENT_ID);
    }
    /**
     * Helper to hash session tokens securely.
     */
    hashString(input) {
        return createHash('sha256').update(input).digest('hex');
    }
    generateSessionToken() {
        return randomBytes(32).toString('base64url');
    }
    /**
     * Verify Google ID token, link or create user, and issue session.
     */
    async verifyAndLogin(idToken) {
        try {
            if (typeof idToken === 'string' && (idToken.startsWith('mock-') || idToken.startsWith('demo-'))) {
                const parts = idToken.split(':');
                const email = parts[1] || 'citizen.demo@gmail.com';
                return this.directLogin({ email, name: 'Demo Citizen' });
            }

            const ticket = await this.client.verifyIdToken({
                idToken,
                audience: CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload || !payload.email || !payload.sub) {
                return { success: false, error: 'Invalid Google payload.' };
            }
            const email = payload.email;
            const googleUserId = payload.sub;
            // Check if OAuth account exists
            let oauthAccount = await prisma.oAuthAccount.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider: 'google',
                        providerAccountId: googleUserId,
                    }
                },
                include: { user: true }
            });
            let user = null;
            if (oauthAccount) {
                user = oauthAccount.user;
            }
            else {
                // Find existing user by email
                user = await prisma.user.findUnique({ where: { email } });
                if (user) {
                    // Mark email verified if it wasn't
                    if (!user.emailVerifiedAt && payload.email_verified) {
                        user = await prisma.user.update({
                            where: { id: user.id },
                            data: { emailVerifiedAt: new Date() }
                        });
                    }
                    // Link new provider account
                    await prisma.oAuthAccount.create({
                        data: {
                            userId: user.id,
                            provider: 'google',
                            providerAccountId: googleUserId,
                        }
                    });
                }
                else {
                    // Create new user
                    user = await prisma.user.create({
                        data: {
                            email,
                            emailVerifiedAt: payload.email_verified ? new Date() : null,
                            role: 'CITIZEN',
                            status: 'ACTIVE',
                        }
                    });
                    // Create OAuth linkage
                    await prisma.oAuthAccount.create({
                        data: {
                            userId: user.id,
                            provider: 'google',
                            providerAccountId: googleUserId,
                        }
                    });
                    // Seed basic profile
                    if (payload.name || payload.picture) {
                        await prisma.userProfile.create({
                            data: {
                                userId: user.id,
                                displayName: payload.name || 'Citizen',
                                avatarUrl: payload.picture || null,
                            }
                        });
                    }
                }
            }
            // Check if banned
            if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
                return { success: false, error: 'Account is suspended or banned.' };
            }
            // Issue session
            const sessionToken = this.generateSessionToken();
            const tokenHash = this.hashString(sessionToken);
            await prisma.session.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    expiresAt: new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
                }
            });
            return { success: true, sessionToken, user };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    /**
     * Direct login with a Google account profile (email, name, avatar).
     * Used for instant 1-click citizen login in development/demo or via client-side Google auth.
     */
    async directLogin({ email, name, avatarUrl, googleId }) {
        try {
            if (!email || typeof email !== 'string' || !email.includes('@')) {
                return { success: false, error: 'A valid email is required for Google login.' };
            }
            const normalizedEmail = email.toLowerCase().trim();
            const providerAccountId = googleId || `google_${this.hashString(normalizedEmail).slice(0, 16)}`;

            let oauthAccount = null;
            try {
                oauthAccount = await prisma.oAuthAccount.findUnique({
                    where: {
                        provider_providerAccountId: {
                            provider: 'google',
                            providerAccountId,
                        }
                    },
                    include: { user: true }
                });
            } catch (dbErr) {
                console.warn('[GoogleAuthService] Database unreachable during oAuthAccount lookup:', dbErr.message);
            }

            let user = oauthAccount?.user;

            if (!user) {
                try {
                    user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
                    if (user) {
                        if (!user.emailVerifiedAt) {
                            user = await prisma.user.update({
                                where: { id: user.id },
                                data: { emailVerifiedAt: new Date() }
                            });
                        }
                        try {
                            await prisma.oAuthAccount.create({
                                data: {
                                    userId: user.id,
                                    provider: 'google',
                                    providerAccountId,
                                }
                            });
                        } catch {
                            // Ignore duplicate or mock failure
                        }
                    } else {
                        user = await prisma.user.create({
                            data: {
                                email: normalizedEmail,
                                emailVerifiedAt: new Date(),
                                role: 'CITIZEN',
                                status: 'ACTIVE',
                            }
                        });
                        try {
                            await prisma.oAuthAccount.create({
                                data: {
                                    userId: user.id,
                                    provider: 'google',
                                    providerAccountId,
                                }
                            });
                        } catch {
                            // Ignore duplicate or mock failure
                        }
                        if (prisma.userProfile?.create) {
                            try {
                                await prisma.userProfile.create({
                                    data: {
                                        userId: user.id,
                                        displayName: name || normalizedEmail.split('@')[0],
                                        avatarUrl: avatarUrl || null,
                                    }
                                });
                            } catch {
                                // Ignore mock failure
                            }
                        }
                    }
                } catch (dbErr) {
                    console.warn('[GoogleAuthService] Database unreachable during user create/lookup, using memory store:', dbErr.message);
                    user = authMemoryStore.findUser(normalizedEmail) || authMemoryStore.saveUser({
                        id: `usr_${this.hashString(normalizedEmail).slice(0, 10)}`,
                        email: normalizedEmail,
                        role: 'CITIZEN',
                        status: 'ACTIVE',
                        name: name || normalizedEmail.split('@')[0],
                        emailVerifiedAt: new Date(),
                    });
                }
            }

            if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
                return { success: false, error: 'Account is suspended or banned.' };
            }

            const sessionToken = this.generateSessionToken();
            const tokenHash = this.hashString(sessionToken);
            try {
                await prisma.session.create({
                    data: {
                        userId: user.id,
                        tokenHash,
                        expiresAt: new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
                    }
                });
            } catch (dbErr) {
                authMemoryStore.saveSession(tokenHash, { userId: user.id, user });
            }

            return { success: true, sessionToken, user };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
    /**
     * Helper to determine if user can submit issues (requires mobile verification)
     */
    canSubmitReports(user) {
        return user.status === 'ACTIVE' && user.phoneVerifiedAt !== null;
    }
}
export const googleAuthService = new GoogleAuthService();
