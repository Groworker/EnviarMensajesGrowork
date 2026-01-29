# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an automated CV/email sending system for recruitment agencies. The system automatically sends personalized emails to job offers on behalf of clients, with email warmup capabilities and reputation tracking.

**Monorepo Structure:**
- `/backend` - NestJS API with scheduled workers
- `/frontend` - Next.js dashboard application

## Common Commands

### Root Level (Development)
```bash
npm run dev              # Run both backend and frontend concurrently
npm run dev:backend      # Run only backend (port 3000)
npm run dev:frontend     # Run only frontend (port 3001)
```

### Backend (`/backend`)
```bash
cd backend
npm run start:dev        # Development mode with watch
npm run build            # Build for production
npm run start:prod       # Run production build
npm run test             # Run unit tests
npm run test:e2e         # Run end-to-end tests
npm run test:cov         # Run tests with coverage
npm run lint             # Lint and auto-fix TypeScript files
npm run format           # Format code with Prettier
```

### Frontend (`/frontend`)
```bash
cd frontend
npm run dev              # Development server (default port 3000, configured to 3001 in root)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Lint with ESLint
```

## Architecture

### Backend Architecture

The backend is a **NestJS** application with **TypeORM** connected to **PostgreSQL**. It uses scheduled cron jobs to automate email sending.

**Key Modules:**

1. **SchedulerModule** ([backend/src/scheduler](backend/src/scheduler))
   - Runs daily at 6:00 AM (cron job)
   - Creates `SendJob` records for each active client
   - Implements email warmup: gradually increases daily email limits by 2-6 emails per day until reaching target
   - Only creates jobs for clients with `estado: 'Envío Activo'` and active send settings

2. **WorkerModule** ([backend/src/worker](backend/src/worker))
   - Processes queued `SendJob` records every minute
   - Finds candidate job offers based on matching criteria (countries, cities)
   - Sends emails in batches of 5 per job per cycle
   - Creates `EmailSend` records to track each sent email
   - Excludes job offers already sent to a client
   - Excludes emails marked as bounced or invalid in `EmailReputation`

3. **EmailModule** ([backend/src/email](backend/src/email))
   - Sends emails via **Gmail API** using domain-wide delegation
   - Requires `google-creds.json` service account file in backend root
   - Impersonates client email addresses (field: `client.email`)
   - Uses nodemailer to construct MIME messages, then sends via Gmail API

4. **ApiModule** ([backend/src/api](backend/src/api))
   - Provides REST endpoints under `/api` prefix
   - **Dashboard endpoints**: `/api/dashboard/stats`, `/api/dashboard/jobs`
   - **Clients endpoints**: CRUD operations for client management

**Database Entities:**
- `Client` - Client records with Zoho integration, email settings, Google Drive folder IDs
- `JobOffer` - Scraped job postings (hotel, puesto, ciudad, email, empresa, pais)
- `ClientSendSettings` - Per-client sending configuration, matching criteria, warmup settings
- `SendJob` - Daily email sending tasks with status tracking (QUEUED, RUNNING, DONE, FAILED)
- `EmailSend` - Individual email tracking (RESERVED, SENT, FAILED)
- `EmailReputation` - Email validity tracking (bounced, invalid flags)

**Database Connection:**
- Uses environment variables: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_SSL`
- Migrations are in [backend/src/migrations](backend/src/migrations)
- `synchronize: false` - must use migrations for schema changes

### Frontend Architecture

The frontend is a **Next.js 16** app (App Router) with **React 19** and **Tailwind CSS**.

**Structure:**
- `/app` - App Router pages and layout
  - `page.tsx` - Dashboard with stats and recent jobs
  - `clients/page.tsx` - Client management page
  - `layout.tsx` - Root layout with navigation
- `/lib/api.ts` - Axios client configured for `http://localhost:3000/api`

**API Integration:**
- Frontend makes API calls to backend at `localhost:3000/api`
- No authentication implemented yet
- Uses React hooks for data fetching and state management

### Email Sending Flow

1. **Daily at 6 AM**: Scheduler creates `SendJob` for each active client
   - Applies warmup logic if enabled: increases `currentDailyLimit` by 2-6 emails
   - Sets `emailsToSend` to current limit

2. **Every Minute**: Worker processes all QUEUED/RUNNING jobs
   - For each job, finds up to 5 candidate job offers:
     - Not previously sent to this client
     - Matches country/city criteria from `ClientSendSettings.matchingCriteria`
     - Email not in `EmailReputation` as bounced/invalid
   - Creates `EmailSend` record with status RESERVED
   - Generates email content (placeholder for now, will be AI-generated)
   - Sends email via Gmail API impersonating `client.email`
   - Updates `EmailSend` status to SENT with `messageId` and `sentAt`
   - Increments `SendJob.emailsSentCount`

3. **Job Completion**: When `emailsSentCount >= emailsToSend`, job status changes to DONE

### Important Implementation Notes

- **Google Workspace Domain-Wide Delegation**: Backend uses service account with domain-wide delegation to send emails as any user in the Google Workspace. The `google-creds.json` file must have this configured.

- **Email Warmup Strategy**: Prevents spam flags by gradually ramping up email volume. Settings in `ClientSendSettings`:
  - `isWarmupActive`: Whether warmup is enabled
  - `currentDailyLimit`: Current daily email cap
  - `targetDailyLimit`: Goal daily limit
  - `maxDailyEmails`: Hard cap

- **Matching Criteria**: Stored as JSONB in `ClientSendSettings.matchingCriteria`:
  ```typescript
  {
    countries?: string[];  // e.g., ["Spain", "Portugal"]
    cities?: string[];     // e.g., ["Barcelona", "Madrid"]
  }
  ```

- **Zoho Integration**: Client data syncs from Zoho CRM (`zohoId`, `zohoModifiedTime` fields)

- **Google Drive Integration**: Each client has multiple folder IDs stored:
  - `idCarpetaCliente` - Main client folder
  - `idCarpetaCv` - CV folder
  - `idCarpetaOld`, `idCarpetaNew`, `idCarpetaDefinitiva` - CV version folders

## Configuration

### Backend Environment Variables

All environment variables are validated at startup using Joi. See [backend/.env.example](backend/.env.example) for complete documentation.

**Required:**
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- `DATABASE_SSL` - Set to `'true'` for SSL connections

**Optional (with defaults):**
- `NODE_ENV` - `development`, `production`, or `test` (default: `development`)
- `PORT` - Backend server port (default: `3000`)
- `ALLOWED_ORIGINS` - Comma-separated CORS origins (default: `http://localhost:3001`)
- `GOOGLE_CREDENTIALS_PATH` - Path to service account JSON (default: `google-creds.json`)
- `WORKER_BATCH_SIZE` - Emails per batch (1-50, default: `5`)
- `SCHEDULER_CRON_EXPRESSION` - Cron schedule (default: `0 6 * * *`)
- `WARMUP_INCREMENT_MIN` - Min warmup increment (default: `2`)
- `WARMUP_INCREMENT_MAX` - Max warmup increment (default: `6`)

**Backend Files Required:**
- `backend/google-creds.json` - Service account credentials with domain-wide delegation

**Frontend Configuration:**
- API base URL in [frontend/lib/api.ts](frontend/lib/api.ts:4) as `http://localhost:3000/api`

## Code Quality Features

### Validation
- **DTOs with class-validator**: All API endpoints validate input using DTOs with decorators
- **Global ValidationPipe**: Automatic validation, transformation, and whitelist filtering
- **Business logic validation**: Services validate domain constraints (e.g., limits, relationships)

### Error Handling
- **Global Exception Filter**: Centralized error handling with standardized responses
- **Logging Interceptor**: Automatic HTTP request/response logging
- **Typed errors**: Uses NestJS exceptions (`NotFoundException`, `BadRequestException`, etc.)

### Type Safety
- **No `any` types**: All types explicitly defined with interfaces
- **DTOs for all endpoints**: Type-safe request/response handling
- **Strict TypeScript**: Full type checking enabled
