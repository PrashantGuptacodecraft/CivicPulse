# CivicPulse

A civic intelligence and incident management platform built for Indian cities and municipalities.

CivicPulse lets citizens report issues like potholes, waterlogging, broken streetlights, or garbage dumps from their phone. The system automatically classifies the issue, assigns it to the right department, dispatches a field worker, and only marks it resolved after the citizen confirms the fix is done.

---

## What Problem Does It Solve

Most government grievance portals are "complaint black holes" — citizens submit issues and never hear back. There is no accountability, no proof of resolution, and no way to know if anything was actually fixed.

CivicPulse changes this with a closed-loop pipeline:

**Report → Verify → Assign → Fix → Confirm → Learn**

1. **Report** — Citizen submits an issue with photo, location, and description from their phone
2. **Verify** — AI checks the evidence, classifies the issue type, and detects duplicates
3. **Assign** — System routes to the right department and assigns a field worker automatically
4. **Fix** — Field worker navigates to the location, must check in via GPS, and uploads before/after photos
5. **Confirm** — Citizen reviews the work and either confirms resolution or reopens the issue
6. **Learn** — Platform tracks department performance, SLA compliance, and predicts hotspot areas

---

## Key Features

**For Citizens**
- Report civic issues from any smartphone (works offline too)
- Upload photos with automatic location tagging
- Track your complaint status in real time
- Confirm or reject the resolution — you have the final say

**For Field Workers**
- Receive assigned tasks with navigation
- GPS check-in required before marking a task started
- Upload before and after photos as proof of work

**For Municipal Administrators**
- Live dashboard with KPIs, SLA compliance, and department performance
- GIS map showing all active issues, heatmaps, and ward boundaries
- Escalation alerts when SLAs are breached
- Audit trail for every action taken in the system

**AI Capabilities**
- Automatically classifies the issue type (pothole, garbage, streetlight, etc.)
- Analyses submitted photos to validate that the evidence matches the complaint
- Detects duplicate reports and links related issues
- Scores issue urgency based on safety risk, location density, and proximity to schools or hospitals

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19 |
| Backend API | Node.js, Express.js |
| AI Microservice | Python 3.10+, FastAPI |
| Database | PostgreSQL, Prisma ORM |
| Maps | MapLibre / Leaflet |
| Deployment | Vercel (frontend + backend serverless) |

---

## Project Structure

```
civiq-project/
├── frontend/        # Next.js citizen and admin web app
├── backend/         # Express.js REST API (serverless on Vercel)
├── services/ai/     # FastAPI AI microservice (classification, vision, deduplication)
├── shared/          # Shared packages (auth, database schema, observability)
└── docs/            # Architecture and UX documentation
```

---

## Live Deployment

| Service | URL |
|---|---|
| Frontend | https://civic-pulse-frontend.vercel.app |
| Backend API | https://civic-pulse-x11a.vercel.app |
| Health Check | https://civic-pulse-x11a.vercel.app/health |

---

## Running Locally

**Requirements:** Node.js 20+, PostgreSQL, Python 3.10+

```bash
# Install all dependencies
npm install

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your database URL and secrets

# Generate Prisma client
npm --workspace=@civiq/db run db:generate

# Run database migrations
npm --workspace=@civiq/db run db:migrate

# Start frontend and backend together
npm run dev
```

For the AI service:
```bash
cd services/ai
pip install -e .[dev]
uvicorn app.main:app --reload
```

---

## Running Tests

```bash
# All tests
npm test

# Backend only (733 tests)
npm run test:backend

# Frontend only (170 tests)
npm run test:frontend
```

---

## Security

- Citizens log in with phone OTP — no anonymous submissions
- Aadhaar numbers and personal data are never stored in raw form
- All AI decisions are advisory only — humans approve high-impact actions
- Every status change and administrative action is logged in an immutable audit trail
- Field workers cannot mark a task complete without GPS check-in and photo proof

---

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
