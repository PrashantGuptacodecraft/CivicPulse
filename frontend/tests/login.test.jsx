import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/login',
}));

// Mock auth context
vi.mock('../context/auth-context.jsx', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

import LoginPage from '../app/login/page.jsx';

describe('LoginPage Component Tests', () => {
  it('renders login page with Citizen and Official tabs', () => {
    const html = renderToStaticMarkup(<LoginPage />);
    expect(html).toContain('Sign in to CivIQ');
    expect(html).toContain('Citizen (OTP)');
    expect(html).toContain('Official Login');
  });

  it('renders Google sign-in button for citizens', () => {
    const html = renderToStaticMarkup(<LoginPage />);
    expect(html).toContain('Continue with Google');
  });

  it('mentions test dummy OTP 1234 and 123456', () => {
    const html = renderToStaticMarkup(<LoginPage />);
    expect(html).toContain('1234');
    expect(html).toContain('123456');
  });

  it('renders mobile number input with +91 country prefix', () => {
    const html = renderToStaticMarkup(<LoginPage />);
    expect(html).toContain('+91');
    expect(html).toContain('Mobile Number');
    expect(html).toContain('Send OTP');
  });
});
