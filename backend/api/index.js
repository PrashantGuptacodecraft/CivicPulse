import { createApp } from '../src/app.js';

const app = createApp();

export default function handler(req, res) {
  // Direct root landing responder for browser inspection and Vercel preview checks
  const url = req.url ? req.url.split('?')[0] : '/';
  if (!url || url === '/' || url === '/api' || url === '/api/index.js') {
    const acceptHeader = (req.headers && req.headers['accept']) || '';
    if (acceptHeader.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CivicPulse Backend API</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
    .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; max-width: 460px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .badge { display: inline-flex; align-items: center; gap: 0.5rem; background: #065f46; color: #34d399; font-weight: 600; font-size: 0.875rem; padding: 0.25rem 0.75rem; border-radius: 9999px; margin-bottom: 1rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem 0; }
    p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin: 0 0 1.5rem 0; }
    a { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 0.6rem 1.25rem; border-radius: 0.5rem; font-weight: 500; font-size: 0.9rem; }
    a:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="dot"></span> API Operational</div>
    <h1>CivicPulse Backend API</h1>
    <p>The CivicPulse serverless API is online and responding. Health checks, authentication, and operational endpoints are active.</p>
    <a href="/health">Check Health Status</a>
  </div>
</body>
</html>`);
    }

    return res.status(200).json({
      name: 'CivicPulse Backend API',
      status: 'ok',
      version: '1.0.0',
      message: 'CivicPulse Serverless API is live and operational.',
      endpoints: {
        health: '/health',
        ready: '/ready',
        metrics: '/metrics',
        issues: '/issues',
        auth: '/auth',
      },
    });
  }

  return app(req, res);
}
