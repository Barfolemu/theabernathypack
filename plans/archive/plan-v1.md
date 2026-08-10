# theabernathypack.com — Implementation Plan (v1)

> **DOCUMENT VERSIONING RULE — READ BEFORE EDITING OR EXECUTING THIS PLAN**
>
> This plan will go through multiple review rounds. Every revision MUST be written to a **new file** (`plan-v2.md`, `plan-v3.md`, …) in this same `plans/` directory — never edit a prior version in place, and never delete prior versions.
>
> Each new version **MUST be fully self-contained**: it must restate every piece of information needed to execute the plan from scratch — tech stack, data model, AWS architecture, IAM policy, milestone tasks, everything — as if it were the *only* document in existence. It must **NOT** say things like "see v1 for the schema" or "unchanged from the previous version" or otherwise require the reader to open an older version to understand or execute any part of the plan. Copy forward everything that still applies, in full, and update whatever changed. Treat each version as a total rewrite, not a diff.
>
> This rule applies to whichever Claude Code session picks up the next revision — do not assume you (or anyone) will have this conversation's context available.

---

## 0. Source of Truth

This plan supersedes and fully incorporates the approved product brief (`requirements/theabernathypack.com - Product Brief v2.md`) plus all tech-stack decisions made during planning. No other document needs to be read to execute this plan.

---

## 1. Project Summary

theabernathypack.com is a community events/social web app for dog walkers centered on Abernathy Park in Sandy Springs, GA (open to the wider community). Members organize and join local events (walks, playdates, hikes, social hours), manage a "family unit" of profiles (people, kids, pets), and discuss events in a lightweight async chat attached to each event.

Built as a portfolio/job-search project demonstrating a modern AWS + AI-assisted developer workflow, run on a tight budget (~$5–10/month target, hosting slightly above that is acceptable).

---

## 2. Final Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend/Backend | Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Shadcn UI | Single hybrid monolith — API routes + server components in one app |
| ORM / DB access | Drizzle ORM + `node-postgres` (`pg`) driver, `drizzle-kit` for migrations | Type-safe, lightweight, works well with a long-lived container (App Runner), no need for edge-specific drivers |
| Database | Serverless PostgreSQL — Neon or Supabase (final vendor picked in M0) | Not an AWS resource; provisioned via its own console/API; connection string stored in AWS SSM Parameter Store |
| Auth | Auth.js (NextAuth v5), Credentials provider, database session strategy | Leaves a clean path to add Google OAuth later per brief's deferred SSO item |
| Password hashing | `bcryptjs` | Pure-JS implementation avoids native build issues in the Docker image |
| Email | Nodemailer via Gmail SMTP (`theabernathypack@gmail.com`, app password) | Credentials stored in SSM as SecureString |
| File storage | AWS S3, private bucket, presigned PUT (upload) / presigned GET (view) URLs | No CloudFront in M1 to save cost; can be added later without an app-code change |
| Python tooling | `uv` for any Python scripts/tooling (deploy helpers, one-off ops scripts) | No Python in the running app itself |
| Hosting/Compute | AWS App Runner, deployed from an ECR image built by GitHub Actions | Chosen over Lightsail: native `AWS::AppRunner::Service` CFN support + native ACM SSL termination |
| Container registry | AWS ECR (`aberpack-app` repository) | GitHub Actions builds and pushes the image; App Runner deploys from it |
| IaC | AWS CloudFormation / SAM only (no Terraform) | Stack name: `aberpack-stack` (may be split into nested stacks if it grows unwieldy) |
| Scheduled cleanup | AWS Lambda (`aberpack-retention-cleanup`) triggered by an EventBridge Scheduler rule (daily) | Cheaper/simpler than adding cron logic inside the App Runner container |
| Secrets/config | AWS SSM Parameter Store, SecureString, under `/aberpack/prod/*` | Parameter Store chosen over Secrets Manager — free vs. ~$0.40/secret/month, acceptable for this threat model |
| DNS/TLS | Route53 (existing hosted zone for theabernathypack.com) + ACM (DNS-validated cert) | See Section 7 note on App Runner custom-domain CFN gap |
| CI/CD | GitHub Actions, deploying via a GitHub OIDC IAM role (no long-lived AWS keys in GitHub) | Built in Milestone M7 |

---

## 3. Data Model

All tables live in the single Postgres database. Enum-like columns are implemented as Postgres `enum` types (via Drizzle) unless noted.

### 3.1 `logins`
Authentication entity.
- `id` (uuid, PK)
- `email` (text, unique, not null)
- `password_hash` (text, not null)
- `status` (enum: `active`, `deactivated`; default `active`) — never hard-deleted
- `created_at`, `updated_at` (timestamptz)

### 3.2 `profiles`
Every login has exactly one **Base Profile**; a **Relationship Profile** has `login_id IS NULL`.
- `id` (uuid, PK)
- `profile_type` (enum: `human`, `dog`)
- `display_name` (text, not null)
- `avatar_key` (text, nullable) — S3 object key; null = use default avatar
- `default_avatar_id` (text, nullable) — id of a curated fallback avatar when no custom photo is uploaded
- `breed` (text, nullable — dogs only)
- `login_id` (uuid, nullable, FK → `logins.id`, unique) — set on conversion; profile becomes a **Base Profile**
- `creator_login_id` (uuid, not null, FK → `logins.id`) — audit trail; sole editor while `login_id IS NULL`
- `invite_email` (text, nullable) — set when an invite is pending
- `invite_token` (text, nullable) — pending invite token, cleared on acceptance
- `created_at`, `updated_at` (timestamptz)

**Edit rule (application-layer, not enforceable purely by FK):** if `login_id IS NOT NULL`, only that login may edit the profile. Otherwise, only `creator_login_id` may edit it. A newly converted Base Profile inherits no edit rights over any other profile.

### 3.3 `profile_relationships`
Captures the relationship type declared at creation time (required — a profile cannot be created without one).
- `id` (uuid, PK)
- `profile_id` (uuid, FK → `profiles.id`, not null)
- `relationship_type` (enum: `child`, `pet`, `partner`, `spouse`, `other`)
- `relationship_note` (text, nullable — free text when `other`)
- `created_at`

### 3.4 `peer_connections`
Peer-to-peer links between two Base Profiles (i.e., between two logins). Grants shared **visibility only**, never shared editing.
- `id` (uuid, PK)
- `requester_login_id` (uuid, FK → `logins.id`, not null)
- `recipient_login_id` (uuid, FK → `logins.id`, not null)
- `relationship_type` (enum: `partner`, `spouse`, `other`)
- `status` (enum: `pending`, `accepted`, `declined`, `severed`)
- `created_at`, `responded_at` (nullable)

### 3.5 `events`
- `id` (uuid, PK)
- `title` (text, not null)
- `description` (text, not null)
- `category` (enum: `casual_walk`, `dog_playdate`, `group_hike`, `social_yappy_hour`, `community_trip`, `other`)
- `category_suggestion` (text, nullable — only meaningful when `category = other`)
- `location_short_desc` (text, nullable)
- `location_map_url` (text, nullable)
- `location_meetup_details` (text, nullable)
- `event_datetime` (timestamptz, not null)
- `creator_profile_id` (uuid, FK → `profiles.id`, not null) — must be a Base Profile
- `created_at`, `updated_at` (timestamptz)

**Constraint:** at least one of `location_short_desc`, `location_map_url`, `location_meetup_details` must be non-null — enforced both by a Postgres `CHECK` constraint and at the form layer.

### 3.6 `event_rsvps`
- `event_id` (uuid, FK → `events.id`, part of composite PK)
- `profile_id` (uuid, FK → `profiles.id`, part of composite PK) — must be a Base Profile (RSVP restricted to logged-in users in M1)
- `status` (enum: `going`, `interested`)
- `updated_at` (timestamptz)

### 3.7 `event_messages`
- `id` (uuid, PK)
- `event_id` (uuid, FK → `events.id`, not null, `ON DELETE CASCADE`)
- `profile_id` (uuid, FK → `profiles.id`, not null)
- `body` (text, not null)
- `created_at` (timestamptz)

### 3.8 Retention
A daily job deletes any `events` row (and cascaded `event_rsvps`/`event_messages`) where `event_datetime < now() - interval '14 days'`.

---

## 4. AWS Architecture Overview

```
GitHub Actions (CI/CD, OIDC role)
   │  build + push image
   ▼
ECR: aberpack-app
   │  deployed from
   ▼
App Runner: aberpack-service  ──────►  Route53 (existing hosted zone)
   │  reads secrets from                 + ACM cert (DNS-validated)
   ▼
SSM Parameter Store: /aberpack/prod/*
   │
   ├──► Neon/Supabase Postgres (external, connection string in SSM)
   └──► S3: aberpack-photos-bucket (avatars/photos, presigned URLs)

EventBridge Scheduler (daily) ──► Lambda: aberpack-retention-cleanup ──► Postgres
```

No VPC / private networking is required — Neon/Supabase is reached over the public internet via SSL, so App Runner needs no VPC connector. This keeps the infrastructure simpler and cheaper.

**Open engineering risk:** AWS App Runner custom domain association (mapping `theabernathypack.com` to the App Runner default domain) has historically had limited/no native CloudFormation resource support. M0 must verify current `AWS::AppRunner::Service`/related CFN support before assuming a pure-CFN path; if unsupported, the fallback is a documented one-time (or CFN custom-resource-wrapped) `aws apprunner associate-custom-domain` CLI step plus the resulting Route53 CNAME/validation records added via CFN.

---

## 5. AWS Services Inventory & Starting IAM Policy

### 5.1 Services used

| Service | Purpose | Naming |
|---|---|---|
| CloudFormation | IaC deployment | Stack: `aberpack-stack` |
| S3 | Avatar/photo storage | `aberpack-photos-bucket` |
| ECR | Container image registry | `aberpack-app` |
| App Runner | App hosting/compute | `aberpack-service` |
| IAM | Roles for App Runner (instance + access), Lambda execution, GitHub OIDC deploy | `aberpack-*-role` |
| ACM | TLS certificate for the custom domain | Not prefixable (random cert ID); tagged `theabernathypack` |
| Route53 | DNS records in the existing hosted zone | Existing hosted zone, not created by this stack |
| SSM Parameter Store | Secrets/config (DB URL, session secret, Gmail app password) | `/aberpack/prod/*` |
| Lambda | Scheduled retention cleanup | `aberpack-retention-cleanup` |
| EventBridge Scheduler | Daily trigger for the cleanup Lambda | `aberpack-retention-schedule` |
| CloudWatch Logs | App Runner + Lambda logs | Auto-created log groups under `/aws/apprunner/aberpack-*` and `/aws/lambda/aberpack-*` |

### 5.2 Starting IAM policy for the `ashley-dev` role

This is the policy the local deploy role needs to author and deploy the CloudFormation stack(s) above. It is scoped to `aberpack*`-named/tagged resources wherever the resource type supports it (per the brief's naming/tagging rules). Replace `<ACCOUNT_ID>`, `<REGION>`, and `<HOSTED_ZONE_ID>` before attaching.

If this exceeds the managed-policy size limit, split it into two policies along the marked boundary (`aberpack-deploy-core` and `aberpack-deploy-iam`) — separating IAM self-management permissions from resource-provisioning permissions is good practice regardless.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudFormationDeploy",
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:DescribeStackResource",
        "cloudformation:DescribeStackResources",
        "cloudformation:GetTemplate",
        "cloudformation:ValidateTemplate",
        "cloudformation:ListStacks",
        "cloudformation:ListStackResources",
        "cloudformation:CreateChangeSet",
        "cloudformation:DescribeChangeSet",
        "cloudformation:ExecuteChangeSet",
        "cloudformation:DeleteChangeSet",
        "cloudformation:TagResource"
      ],
      "Resource": "arn:aws:cloudformation:<REGION>:<ACCOUNT_ID>:stack/aberpack-*/*"
    },
    {
      "Sid": "S3AppBuckets",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:PutBucketTagging",
        "s3:PutBucketCORS",
        "s3:PutBucketPolicy",
        "s3:PutBucketPublicAccessBlock",
        "s3:PutEncryptionConfiguration",
        "s3:GetBucketLocation",
        "s3:GetBucketPolicy",
        "s3:ListBucket",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::aberpack-*",
        "arn:aws:s3:::aberpack-*/*"
      ]
    },
    {
      "Sid": "ECRRepo",
      "Effect": "Allow",
      "Action": [
        "ecr:CreateRepository",
        "ecr:DeleteRepository",
        "ecr:DescribeRepositories",
        "ecr:SetRepositoryPolicy",
        "ecr:PutLifecyclePolicy",
        "ecr:TagResource"
      ],
      "Resource": "arn:aws:ecr:<REGION>:<ACCOUNT_ID>:repository/aberpack-*"
    },
    {
      "Sid": "ECRAuthToken",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "AppRunner",
      "Effect": "Allow",
      "Action": [
        "apprunner:CreateService",
        "apprunner:UpdateService",
        "apprunner:DeleteService",
        "apprunner:DescribeService",
        "apprunner:ListServices",
        "apprunner:TagResource",
        "apprunner:CreateAutoScalingConfiguration",
        "apprunner:DescribeAutoScalingConfiguration",
        "apprunner:DeleteAutoScalingConfiguration",
        "apprunner:AssociateCustomDomain",
        "apprunner:DisassociateCustomDomain",
        "apprunner:DescribeCustomDomains"
      ],
      "Resource": [
        "arn:aws:apprunner:<REGION>:<ACCOUNT_ID>:service/aberpack-*/*",
        "arn:aws:apprunner:<REGION>:<ACCOUNT_ID>:autoscalingconfiguration/aberpack-*/*"
      ]
    },
    {
      "Sid": "ACMCertificate",
      "Effect": "Allow",
      "Action": [
        "acm:RequestCertificate",
        "acm:DescribeCertificate",
        "acm:DeleteCertificate",
        "acm:AddTagsToCertificate",
        "acm:ListCertificates",
        "acm:ListTagsForCertificate"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestTag/Project": "theabernathypack"
        }
      }
    },
    {
      "Sid": "Route53ExistingZone",
      "Effect": "Allow",
      "Action": [
        "route53:GetHostedZone",
        "route53:ListResourceRecordSets",
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/<HOSTED_ZONE_ID>"
    },
    {
      "Sid": "Route53ChangeStatus",
      "Effect": "Allow",
      "Action": "route53:GetChange",
      "Resource": "arn:aws:route53:::change/*"
    },
    {
      "Sid": "SSMParameters",
      "Effect": "Allow",
      "Action": [
        "ssm:PutParameter",
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
        "ssm:DeleteParameter",
        "ssm:AddTagsToResource"
      ],
      "Resource": "arn:aws:ssm:<REGION>:<ACCOUNT_ID>:parameter/aberpack/*"
    },
    {
      "Sid": "LambdaRetentionJob",
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:DeleteFunction",
        "lambda:GetFunction",
        "lambda:AddPermission",
        "lambda:RemovePermission",
        "lambda:TagResource"
      ],
      "Resource": "arn:aws:lambda:<REGION>:<ACCOUNT_ID>:function:aberpack-*"
    },
    {
      "Sid": "EventBridgeScheduler",
      "Effect": "Allow",
      "Action": [
        "scheduler:CreateSchedule",
        "scheduler:UpdateSchedule",
        "scheduler:DeleteSchedule",
        "scheduler:GetSchedule",
        "scheduler:TagResource"
      ],
      "Resource": "arn:aws:scheduler:<REGION>:<ACCOUNT_ID>:schedule/*/aberpack-*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:PutRetentionPolicy",
        "logs:DeleteLogGroup",
        "logs:DescribeLogGroups",
        "logs:TagResource"
      ],
      "Resource": [
        "arn:aws:logs:<REGION>:<ACCOUNT_ID>:log-group:/aws/lambda/aberpack-*",
        "arn:aws:logs:<REGION>:<ACCOUNT_ID>:log-group:/aws/apprunner/aberpack-*"
      ]
    },
    {
      "Sid": "STSIdentity",
      "Effect": "Allow",
      "Action": "sts:GetCallerIdentity",
      "Resource": "*"
    },
    {
      "Sid": "IAMRoleManagement_SplitCandidate",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:TagRole",
        "iam:CreatePolicy",
        "iam:DeletePolicy",
        "iam:GetPolicy",
        "iam:ListPolicyVersions",
        "iam:CreatePolicyVersion",
        "iam:DeletePolicyVersion"
      ],
      "Resource": [
        "arn:aws:iam::<ACCOUNT_ID>:role/aberpack-*",
        "arn:aws:iam::<ACCOUNT_ID>:policy/aberpack-*"
      ]
    },
    {
      "Sid": "IAMPassRole_SplitCandidate",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/aberpack-*",
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": [
            "apprunner.amazonaws.com",
            "tasks.apprunner.amazonaws.com",
            "lambda.amazonaws.com"
          ]
        }
      }
    },
    {
      "Sid": "GitHubOIDCProviderOneTime",
      "Effect": "Allow",
      "Action": [
        "iam:CreateOpenIDConnectProvider",
        "iam:GetOpenIDConnectProvider",
        "iam:ListOpenIDConnectProviders",
        "iam:TagOpenIDConnectProvider"
      ],
      "Resource": "*"
    }
  ]
}
```

**Note:** Neon/Supabase is not an AWS resource — no IAM entries are needed for the database itself. Its connection string is created manually (or via the vendor's own CLI/API, out of band) and stored into SSM in M0.

**Note:** The App Runner *instance role* and *access role* (what the running service itself assumes at runtime — e.g., read access to the S3 bucket and SSM parameters) are separate, narrower roles created *by* the CloudFormation template, not attached to `ashley-dev`. They'll be defined inside the `aberpack-stack` template in M0, not in this policy.

---

## 6. Milestones

Each milestone is independently shippable/testable. Order reflects dependencies.

### M0 — Foundation: App Scaffold & AWS Bootstrap
- Initialize the Next.js 14 app (App Router, TS, Tailwind, Shadcn UI) inside this repo.
- Set up Drizzle ORM, initial schema migration for all tables in Section 3.
- Provision the Postgres database (Neon or Supabase — pick vendor here) and store the connection string in SSM.
- Author the CloudFormation stack(s): S3 bucket, ECR repo, App Runner service (initially serving a placeholder "hello world" image), IAM roles (instance/access), ACM certificate, Route53 records, SSM parameters, Lambda + EventBridge Scheduler skeleton.
- Attach the Section 5.2 policy to `ashley-dev` (or a split version of it).
- Verify the App Runner custom-domain path (see Section 4 open risk) and document the actual working approach.
- **Acceptance:** `https://theabernathypack.com` resolves over HTTPS to a running (placeholder) App Runner service; CloudFormation stack deploys cleanly from a clean AWS account state.

### M1 — Auth & Login Entity
- `logins` table, registration, login, logout, password reset (emailed token via Nodemailer/Gmail), account deactivation.
- Auth.js Credentials provider with DB session strategy.
- **Acceptance:** a user can register, log in, log out, reset a forgotten password, and deactivate their account; a deactivated login cannot log in.

### M2 — Profile Architecture (Base & Relationship Profiles)
- Auto-create a Base Profile on registration (1:1 with the new login).
- CRUD for Relationship Profiles (dog/kid/partner), enforcing the creator-only edit rule (Section 3.2).
- Avatar upload (S3 presigned PUT) and curated default-avatar picker (separate sets for humans/dogs).
- Invite flow: add an email to a Relationship Profile → "Send Invite" → recipient accepts → profile converts to a Base Profile in place; creator loses edit rights; converted profile inherits no rights over other profiles.
- **Acceptance:** create/edit/delete dog and kid/partner profiles; upload and change an avatar; send an invite and confirm conversion transfers edit rights correctly.

### M3 — Family Units & Peer Connections
- `peer_connections`: send/accept/decline a connection request between two Base Profiles, with a relationship type.
- "My Pack" view aggregates: profiles created by the current Base Profile + profiles visible via accepted peer connections (read-only for the peer's profiles).
- Severance: break an accepted connection; visibility is removed on both sides immediately.
- **Acceptance:** two test accounts connect, each sees the other's pack read-only, then sever and lose visibility.

### M4 — Event CRUD & Location/Category Rules
- `events` table, "Create New Event" flow, edit/delete by creator.
- Category dropdown (fixed list + "Other" with optional free-text suggestion).
- Location validation: at least one of the three fields required, enforced in the form and via a DB `CHECK` constraint.
- **Acceptance:** create/edit/delete an event; submitting with all three location fields empty is rejected; "Other" category accepts a suggestion.

### M5 — RSVP & Event Chat + Retention Job
- `event_rsvps`: Going/Interested/Revoke, restricted to Base Profiles.
- `event_messages`: async chat thread on the event details view (polling refresh, no WebSockets).
- Deploy `aberpack-retention-cleanup` Lambda + daily EventBridge Scheduler rule; purges events (and cascaded RSVPs/messages) 14 days past `event_datetime`.
- **Acceptance:** RSVP status changes and revokes correctly; chat messages post and display in order; a manually-backdated test event is purged by the scheduled job.

### M6 — Navigation, Responsive UI & Calendar
- Desktop: dual-column layout, central feed + sticky mini-calendar sidebar that filters the feed on date selection.
- Mobile: bottom nav (Feed / Calendar / Create / My Pack).
- View switcher (List ⇄ Calendar Grid) available on all viewports.
- **Acceptance:** manually verified across desktop and mobile breakpoints; calendar date selection correctly filters the feed on both.

### M7 — CI/CD Pipeline
- GitHub Actions: lint + test on PR; on merge to `main`, build the Docker image, push to ECR, update the App Runner service.
- GitHub OIDC IAM role (`aberpack-github-deploy-role`) — no long-lived AWS access keys stored in GitHub.
- **Acceptance:** a merge to `main` results in an automatic, successful production deployment with no manual AWS CLI steps.

---

## 7. Explicitly Out of Scope (Deferred)

Per the brief, not part of this milestone set:
- SSO/OAuth login (Google, etc.)
- Push/email notifications and reminders
- Automated content moderation
- In-app suggestion box + Jira integration + Claude Code PR automation pipeline
- Real-time (WebSocket) chat
- CloudFront in front of S3 (may be added later without app-code changes)

---

## 8. Open Risks / Engineering Notes Carried Into Build

1. **App Runner custom domain + CloudFormation** — confirm current native CFN support in M0; fall back to a documented CLI step or custom resource if still unsupported.
2. **IAM policy size** — the Section 5.2 policy may need to be split into two managed policies (core resources vs. IAM/PassRole) to stay under the managed-policy size limit; both halves are already delineated by Sid naming (`_SplitCandidate` suffix marks the IAM-management half).
3. **DB vendor pick (Neon vs. Supabase)** — finalize in M0 based on current free-tier terms at build time; both satisfy the stack requirements equally as described here.
