import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authRouter } from './auth.router.js';
import { otpService } from './otp/otp.service.js';
import { passwordAuthService } from './password/password.service.js';
import { googleAuthService } from './google/google.service.js';
import { prisma } from '@civiq/db';

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Auth Router Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/otp/send', () => {
    it('returns 400 when phone is missing', async () => {
      const res = await request(app).post('/auth/otp/send').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/phone is required/i);
    });

    it('returns 400 for invalid phone number format', async () => {
      const res = await request(app).post('/auth/otp/send').send({ phone: '12345' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid phone number/i);
    });

    it('sends OTP successfully for valid phone', async () => {
      vi.spyOn(otpService, 'requestOtp').mockResolvedValueOnce({ success: true });
      const res = await request(app).post('/auth/otp/send').send({ phone: '+919876543210' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /auth/otp/verify', () => {
    it('returns 400 when parameters are missing', async () => {
      const res = await request(app).post('/auth/otp/verify').send({ phone: '+919876543210' });
      expect(res.status).toBe(400);
    });

    it('returns 401 when OTP verification fails', async () => {
      vi.spyOn(otpService, 'verifyOtp').mockResolvedValueOnce({
        success: false,
        error: 'Invalid OTP.',
      });
      const res = await request(app).post('/auth/otp/verify').send({
        phone: '+919876543210',
        otp: '000000',
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid OTP.');
    });

    it('returns token and user on successful verification', async () => {
      vi.spyOn(otpService, 'verifyOtp').mockResolvedValueOnce({
        success: true,
        sessionToken: 'test-session-token-123',
      });
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'usr-123',
        phone: '+919876543210',
        name: 'Test Citizen',
        role: 'CITIZEN',
      });

      const res = await request(app).post('/auth/otp/verify').send({
        phone: '+919876543210',
        otp: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBe('test-session-token-123');
      expect(res.body.user.role).toBe('CITIZEN');
    });
  });

  describe('POST /auth/password/login', () => {
    it('returns 400 when email or password missing', async () => {
      const res = await request(app).post('/auth/password/login').send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
    });

    it('returns 401 when login credentials invalid', async () => {
      vi.spyOn(passwordAuthService, 'login').mockResolvedValueOnce({
        success: false,
        error: 'Invalid email or password.',
      });

      const res = await request(app).post('/auth/password/login').send({
        email: 'officer@pune.gov.in',
        password: 'wrongpassword',
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password.');
    });

    it('returns session token on successful login', async () => {
      vi.spyOn(passwordAuthService, 'login').mockResolvedValueOnce({
        success: true,
        sessionToken: 'official-session-token',
      });
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'usr-officer-1',
        email: 'officer@pune.gov.in',
        name: 'Inspector Ramesh',
        role: 'DEPARTMENT_OFFICER',
      });

      const res = await request(app).post('/auth/password/login').send({
        email: 'officer@pune.gov.in',
        password: 'correctpassword',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBe('official-session-token');
      expect(res.body.user.role).toBe('DEPARTMENT_OFFICER');
    });
  });

  describe('POST /auth/google', () => {
    it('returns 400 when neither token nor email is provided', async () => {
      const res = await request(app).post('/auth/google').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/credential or email is required/i);
    });

    it('returns token and user on successful direct Google login', async () => {
      vi.spyOn(googleAuthService, 'directLogin').mockResolvedValueOnce({
        success: true,
        sessionToken: 'google-session-tok-123',
        user: { id: 'usr-google-1' },
      });
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'usr-google-1',
        email: 'citizen@gmail.com',
        phone: null,
        role: 'CITIZEN',
        profile: { displayName: 'Google Citizen' },
      });

      const res = await request(app).post('/auth/google').send({
        email: 'citizen@gmail.com',
        name: 'Google Citizen',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBe('google-session-tok-123');
      expect(res.body.user.role).toBe('CITIZEN');
      expect(res.body.user.name).toBe('Google Citizen');
    });

    it('returns token on verified Google idToken', async () => {
      vi.spyOn(googleAuthService, 'verifyAndLogin').mockResolvedValueOnce({
        success: true,
        sessionToken: 'google-verified-tok',
        user: { id: 'usr-google-2' },
      });
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'usr-google-2',
        email: 'verified@gmail.com',
        phone: null,
        role: 'CITIZEN',
      });

      const res = await request(app).post('/auth/google').send({
        idToken: 'valid-google-jwt-token',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBe('google-verified-tok');
      expect(res.body.user.role).toBe('CITIZEN');
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
