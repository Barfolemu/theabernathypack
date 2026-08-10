# theabernathypack.com

A community events app for dog walkers at Abernathy Park (Sandy Springs, GA) — event feed, RSVPs, per-event chat, family/pack profile management, and a calendar view. Built end-to-end (product brief → plan → milestones → AWS deploy pipeline) as a portfolio project.

**Live:** https://theabernathypack.com

## Tech stack

- **App:** Next.js (App Router) + TypeScript, Tailwind CSS, Shadcn UI
- **Data:** PostgreSQL (Neon, serverless) via Drizzle ORM, migrations via `drizzle-kit`
- **Auth:** Hand-rolled credentials auth — bcrypt password hashing, database-backed sessions (random token, only its hash stored server-side), no Auth.js
- **Storage:** AWS S3 (avatar uploads, presigned PUT/GET)
- **Email:** Nodemailer via Gmail OAuth2 (password reset, pack invites)
- **Hosting:** AWS Lightsail Containers, custom domain via Route53 + a Lightsail-managed certificate
- **Scheduled jobs:** AWS Lambda + EventBridge Scheduler (daily retention cleanup)
- **CI/CD:** GitHub Actions — lint/build gate on PRs; on merge to `main`, migrate the prod DB, then build/push/deploy the container image, authenticated via a GitHub OIDC role (no long-lived AWS keys in GitHub)

## Features

- Local email/password auth, password reset, account deactivation
- Base profiles (one per login) and Relationship Profiles (kids, dogs, partners — no login of their own)
- A unified relationships graph ("My Pack") with category-based edges and single-side severance
- Invite flow for linking another login to a Relationship Profile
- Event CRUD with category + flexible location fields, creator/admin permissions
- RSVP (Going/Interested/Revoke) and per-event async chat
- Daily retention cleanup of old events/messages via a scheduled Lambda
- Responsive nav: desktop dual-column feed + sticky mini-calendar, mobile bottom nav, List ⇄ Calendar Grid view switcher
- Minimal admin capability (`/admin`): reset any user's password, delete any event

## Local development

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and the other values below
npm run dev
```

Required `.env` values:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (direct, not pooled — see note below) |
| `AWS_PROFILE`, `AWS_REGION`, `AWS_ACCOUNT_ID` | Used locally for S3 presigned URLs and any `aws` CLI work against this project |
| `EMAIL_FROM`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Gmail OAuth2 credentials for sending email |
| `APP_URL` | Base URL used to build links inside outgoing emails |

Neon's pooled (`-pooler`) connection string is deliberately **not** used — the app runs `pg.Pool` in a long-lived container, which conflicts with PgBouncer transaction-mode pooling (prepared statements, etc.).

```bash
npm run lint         # eslint
npm run build         # also runs full TypeScript type-checking
npm run db:generate   # generate a new Drizzle migration from schema.ts
npm run db:migrate    # apply migrations
```

## Deployment

Merges to `main` deploy automatically — see `.github/workflows/deploy.yml`. No manual AWS CLI steps are needed for a routine deploy. AWS infrastructure is defined in `aws/cloudformation/` (see that directory's `README.md` for deploy notes, including a couple of ordering gotchas around certificate DNS validation and the CI/CD role's GitHub OIDC trust policy).

## Project history

This project was built in planned milestones (M0–M7); see `plans/plan-v5.md` (the final, complete plan — earlier revisions are kept in `plans/archive/` for reference) and `requirements/theabernathypack.com - Product Brief v2.md` for the full spec and design rationale behind decisions like the auth approach, the data model, and the hosting choice.
