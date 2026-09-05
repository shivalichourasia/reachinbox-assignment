# ReachInbox Email Scheduler

ReachInbox schedules bulk email sends with an Express API, PostgreSQL, Redis, BullMQ, and a React frontend.

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- A Google OAuth client for login

## Run the backend

Start Redis, PostgreSQL, and Elasticsearch from the project root:

```bash
docker compose up -d
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://reachinbox:reachinbox@localhost:5432/reachinbox?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
ELASTICSEARCH_URL=http://localhost:9200
JWT_SECRET=replace-with-a-secure-secret
FRONTEND_URL=http://localhost:5173

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_MS=2000
MAX_EMAILS_PER_HOUR=200
MAX_EMAILS_PER_HOUR_PER_SENDER=50
```

In Google Cloud Console, create an OAuth 2.0 Web application and add `http://localhost:4000/api/auth/google/callback` as an authorized redirect URI. Copy its client ID and secret into `backend/.env`.

Install dependencies, create the database schema, then start the API and worker in separate terminals:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

```bash
cd backend
npm run worker:dev
```

The API is available at `http://localhost:4000`; Bull Board is at `http://localhost:4000/admin/queues`.

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` and sign in with Google.

## Ethereal Email

No Ethereal credentials are required in `.env`. When a user has no sender, the dashboard creates one automatically. The backend uses `nodemailer.createTestAccount()` to create an Ethereal SMTP account and persists its SMTP credentials with that sender.

To inspect delivered test emails, use the Ethereal preview URL written to the worker log after a send. You can also create a new Ethereal sender from the application; each sender receives its own test mailbox.

## Architecture

### Scheduling

The API validates a compose request, creates one `EmailJob` row per recipient, and adds a BullMQ job with a delay calculated from `scheduledFor`. The BullMQ job ID is derived from the database job ID, preventing duplicate queued jobs.

### Persistence and restart recovery

PostgreSQL is the source of truth for email jobs. Redis runs with append-only-file persistence in Docker, preserving BullMQ data across container and host restarts. On API or worker startup, reconciliation finds pending database jobs that are absent from BullMQ and requeues them using their deterministic job IDs.

### Rate limiting and concurrency

Redis hourly counters enforce global and per-sender limits. When a limit is reached, the worker marks the job as rescheduled and moves it to the next UTC hour boundary. The BullMQ worker uses `WORKER_CONCURRENCY` for parallel processing and a queue limiter that allows one dispatch per `MIN_DELAY_BETWEEN_EMAILS_MS`. Failed jobs retry up to five times with exponential backoff.

## Features implemented

### Backend

- Google OAuth login and JWT-protected API routes
- Email sender creation using Ethereal SMTP accounts
- CSV/text lead parsing and email-address extraction
- Per-recipient scheduling with BullMQ delayed jobs
- PostgreSQL job persistence and startup reconciliation
- Redis-backed global and per-sender hourly rate limiting
- Configurable worker concurrency, send spacing, retries, and exponential backoff
- Bull Board queue dashboard
- Elasticsearch indexing and email-job search
- Optional Slack OAuth integration and rate-limit notifications

### Frontend

- Google login and protected routes
- Auth callback and persisted session state
- Dashboard with scheduled and sent-email tables
- Compose modal with sender selection, lead-file parsing, scheduling, and delay controls
- Automatic initial Ethereal sender creation
- Slack connection and disconnection controls
- Loading, empty, error, and toast feedback states
