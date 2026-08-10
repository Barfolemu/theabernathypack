# theabernathypack.com — Implementation Plan (v5)

> **Revision notes (v5):** One change from v4: a missed requirement surfaced after M1 shipped — the brief always implied an admin capability (reset a user's password, delete events, other moderation tasks) but no milestone ever named it. Rather than invent a formal "M1.5" milestone, the decision was to scope today's change strictly to what M1 already owns (the `logins`/auth domain) and defer everything else to whichever milestone already owns that data, adding it there when that milestone is actually planned/built rather than pre-building scaffolding for entities that don't exist yet. Concretely: **added now** — a `role` column on `logins` (`member`/`admin`), a `requireAdmin()` auth-gate helper, and one real admin capability (an admin can reset any user's password from `/admin`, which also invalidates that user's existing sessions). **Deferred, to be folded into the owning milestone when it's built** — "admin can delete any event" belongs in M4 (events), any profile/relationship moderation belongs in M2/M3 if it turns out to be needed, and a real multi-feature admin dashboard is deferred until there are enough admin capabilities to justify shared UI (arbitrarily, once M4 adds its own admin action, revisit consolidating `/admin` into a proper dashboard). This revision updates §3.1 (adds `role`) and §6's M1 section (adds the role/admin-reset bullets and a second acceptance line), and adds short forward-looking admin notes to M2, M3, and M4 so this doesn't get missed a second time. Nothing else changed from v4. Every section below is complete and current — nothing in this document depends on v1 through v4.

> **DOCUMENT VERSIONING RULE — READ BEFORE EDITING OR EXECUTING THIS PLAN**
>
> This plan will go through multiple review rounds. Every revision MUST be written to a **new file** (`plan-v6.md`, `plan-v7.md`, …) in this same `plans/` directory — never edit a prior version in place, and never delete prior versions.
>
> Each new version **MUST be fully self-contained**: it must restate every piece of information needed to execute the plan from scratch — tech stack, data model, AWS architecture, IAM policy, milestone tasks, everything — as if it were the *only* document in existence. It must **NOT** say things like "see v4 for the schema" or "unchanged from the previous version" or otherwise require the reader to open an older version to understand or execute any part of the plan. Copy forward everything that still applies, in full, and update whatever changed. Treat each version as a total rewrite, not a diff.
>
> This rule applies to whichever Claude Code session picks up the next revision — do not assume you (or anyone) will have this conversation's context available.

---

## 0. Source of Truth

This plan supersedes and fully incorporates the approved product brief (`requirements/theabernathypack.com - Product Brief v2.md`) plus all tech-stack and data-model decisions made during planning. No other document needs to be read to execute this plan.

---

## 1. Project Summary

theabernathypack.com is a community events/social web app for dog walkers centered on Abernathy Park in Sandy Springs, GA (open to the wider community). Members organize and join local events (walks, playdates, hikes, social hours), manage a "family unit" of profiles (people, kids, pets), and discuss events in a lightweight async chat attached to each event.

Built as a portfolio/job-search project demonstrating a modern AWS + AI-assisted developer workflow, run on a tight budget (~$5–10/month target, a little more is acceptable, but not dramatically more).

---

## 2. Final Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend/Backend | Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Shadcn UI. `next.config.js` must set `output: 'standalone'` | Standalone output produces a minimal, self-contained build for the Docker image — smaller image, no `node_modules` install needed at container-build time |
| ORM / DB access | Drizzle ORM + `node-postgres` (`pg`) driver, `drizzle-kit` for migrations | Type-safe, lightweight, works well with a long-lived container, no need for edge-specific drivers |
| Database | Serverless PostgreSQL — Neon or Supabase (final vendor picked in M0) | Not an AWS resource; provisioned via its own console/API; connection string stored in AWS SSM Parameter Store |
| DB migrations | `drizzle-kit migrate` run as its own step in the GitHub Actions deploy workflow, **before** the new container is deployed — not run inside the container's startup/entrypoint | Running migrations at container startup risks concurrent execution if the platform ever runs more than one instance during a deploy; a single CI step runs exactly once and fails the deploy fast if migrations fail |
| Auth | **Hand-rolled credentials auth with database-backed sessions** — no Auth.js/NextAuth. bcryptjs password hashing; a random 32-byte session token, only its SHA-256 hash stored server-side (in `sessions`), raw token in an httpOnly cookie; same hash-token pattern for single-use password-reset tokens (`password_reset_tokens`, 1-hour expiry) | Auth.js's Credentials provider only supports the JWT session strategy natively (`CALLBACK_CREDENTIALS_JWT_ERROR`); forcing database sessions requires an undocumented internals hack. Rolling sessions by hand gives real DB-backed sessions (needed for instant revocation on deactivation) without depending on unofficial library behavior. Revisit Auth.js when Google OAuth SSO (deferred, §7) is picked up — that's the scenario it's actually designed for. |
| Password hashing | `bcryptjs` | Pure-JS implementation avoids native build issues in the Docker image |
| Email | Nodemailer via Gmail, OAuth2 auth (`theabernathypack@gmail.com`, Google Cloud OAuth client + refresh token — Nodemailer auto-refreshes the access token) | Client ID/secret/refresh token stored in SSM as SecureString for production; local dev reads them from `.env` |
| File storage | AWS S3, private bucket, presigned PUT (upload) / presigned GET (view) URLs | No CloudFront in M1 to save cost; can be added later without an app-code change |
| Python tooling | `uv` for any Python scripts/tooling (deploy helpers, one-off ops scripts) | No Python in the running app itself |
| Hosting/Compute | **AWS Lightsail Containers** (`aberpack-service`) | App Runner was ruled out: AWS closed it to new customers as of April 30, 2026 and put it in maintenance mode. ECS Express Mode (App Runner's suggested successor) was also considered and rejected: it requires an Application Load Balancer with its own ~$16–20/month baseline cost, and its CloudFormation service resource still has no custom-domain property (same gap as App Runner, requiring manual ALB listener/cert wiring). Lightsail Containers is cheaper ($7/month Nano tier, no separate load balancer), is not being sunset, and has *full native* CloudFormation support for custom domain + certificate via `AWS::Lightsail::Container.PublicDomainNames` referencing an `AWS::Lightsail::Certificate` resource — no CLI fallback or custom resource needed |
| Container registry | Lightsail's built-in private container registry (per-service, not a separate resource) | Images are pushed via `aws lightsail push-container-image` (uses the `lightsailctl` plugin) or the underlying `CreateContainerServiceRegistryLogin` + `RegisterContainerImage` API calls, run from GitHub Actions. No ECR involved. |
| IaC | AWS CloudFormation / SAM only (no Terraform) | Stack name: `aberpack-stack` (may be split into nested stacks if it grows unwieldy) |
| Scheduled cleanup | AWS Lambda (`aberpack-retention-cleanup`) triggered by an EventBridge Scheduler rule (daily) | Cheaper/simpler than adding cron logic inside the app container |
| Secrets/config | AWS SSM Parameter Store, SecureString, under `/aberpack/prod/*` | Parameter Store chosen over Secrets Manager — free vs. ~$0.40/secret/month, acceptable for this threat model |
| Runtime AWS access | Lightsail Container Service's default per-service IAM role, exposed to the running container via the standard ECS-style credentials metadata endpoint (`$AWS_CONTAINER_CREDENTIALS_RELATIVE_URI`) | Confirmed Lightsail Container Service supports a runtime role (distinct from the separate `EcrImagePullerRole`, which isn't used since we're not pulling from ECR); exact CFN mechanics for granting this role S3/SSM access to be confirmed in M0 |
| DNS/TLS | Route53 (existing hosted zone for theabernathypack.com) + `AWS::Lightsail::Certificate`, referenced by name from the container service's `PublicDomainNames` | Fully native CFN, no manual/CLI step required |
| CI/CD | GitHub Actions, deploying via a GitHub OIDC IAM role (no long-lived AWS keys in GitHub) | Built in Milestone M7 |

---

## 3. Data Model

All tables live in the single Postgres database. Enum-like columns are implemented as Postgres `enum` types (via Drizzle) unless noted. Every profile is just a record; a "Base Profile" is simply a profile with `login_id` set — it is not a separate table or type.

### 3.1 `logins`
Authentication entity — referenced from exactly one place elsewhere in the schema (`profiles.login_id`).
- `id` (uuid, PK)
- `email` (text, unique, not null)
- `password_hash` (text, not null)
- `status` (enum: `active`, `deactivated`; default `active`) — never hard-deleted
- `role` (enum: `member`, `admin`; default `member`) — **new in v5.** Gates `/admin` and admin-only server actions via `requireAdmin()`. No self-serve promotion path exists yet — the first admin is promoted with a manual `UPDATE logins SET role = 'admin' WHERE email = '...'`, which is an accepted manual step, not an oversight (a promotion UI would need its own admin-of-admins story, not worth building for a single-operator portfolio project).
- `created_at`, `updated_at` (timestamptz)

### 3.2 `profiles`
- `id` (uuid, PK)
- `profile_type` (enum: `human`, `dog`)
- `display_name` (text, not null)
- `avatar_key` (text, nullable) — S3 object key; null = use default avatar
- `default_avatar_id` (text, nullable) — id of a curated fallback avatar when no custom photo is uploaded
- `breed` (text, nullable — dogs only)
- `login_id` (uuid, nullable, FK → `logins.id`, unique) — set when this profile is claimed by a login; a profile with this set is a **Base Profile**
- `creator_id` (uuid, not null, FK → `profiles.id`) — the profile that created this one. Permanent audit field; does not change on conversion.
- `created_at`, `updated_at` (timestamptz)

**Edit rule:** if `login_id IS NOT NULL`, only that login (acting as its own profile) may edit the profile's fields. Otherwise, only the profile referenced by `creator_id` may edit it. Conversion (an invite being accepted, see 3.4) only ever sets `login_id` — nothing else about the row changes, and nothing elsewhere in the schema needs to be updated as a side effect of conversion.

### 3.3 `relationships`
A single, symmetric edge between two profiles with a category. This is the only relationship-tracking table in the schema — it replaces any separate notion of "family membership," "peer connection," or "joint ownership." "My Pack" is computed directly from this table (see 3.3.3) with no separate aggregation logic.

- `id` (uuid, PK)
- `profile_id_a` (uuid, FK → `profiles.id`, not null)
- `profile_id_b` (uuid, FK → `profiles.id`, not null)
- `category` (enum: `child`, `pet`, `partner`, `spouse`, `other`)
- `created_by_profile_id` (uuid, FK → `profiles.id`, not null) — audit only
- `created_at` (timestamptz)
- Unique constraint on the pair, stored in canonical order (e.g., always store the lexicographically/numerically smaller `id` as `profile_id_a`) to prevent duplicate or reverse-duplicate edges between the same two profiles.

**3.3.1 Who may create an edge:**
- If **both** profiles in the edge have `login_id IS NOT NULL` (both are Base Profiles): either profile's login holder may create the edge unilaterally. No approval step exists yet — this is an accepted, deliberate simplification until notifications/approval are built in a future milestone.
- If **either** profile has `login_id IS NULL` (a non-base Relationship Profile): the edge may only be created by that profile's current controller (`creator_id`, or the login holder if it has since converted). If both profiles are non-base, the actor must control both.
- This is a real, deliberate restriction: it's what stops an unrelated invited person (e.g. a family friend who was invited for something else and now has their own Base Profile) from unilaterally attaching themselves to someone else's kid or dog. Only the kid/dog's own controller can do that linking.

**3.3.2 Who may remove (sever) an edge:** the same rule as creation, applied at the time of removal — i.e., based on current control of the two profiles, not who originally created the edge. Removal is a hard delete of the row; there is no soft "severed" status. This is intentionally granular per-edge: e.g., after a separation, both parents can keep their own edge to a shared kid while one parent's edge to the family dog is removed independently.

**3.3.3 "My Pack" query:** for a given profile P, its pack is every profile joined to P via a row in `relationships` (either as `profile_id_a` or `profile_id_b`) — a single join, one hop, no recursion. Creating a new Relationship Profile automatically inserts one `relationships` row (creator ↔ new profile) at creation time, so "profiles I created" and "profiles connected to me" are the same query, not two separate concepts.

### 3.4 `invites`
Separate from `profiles` entirely. A row exists only while an invite is outstanding.
- `id` (uuid/guid, PK) — this value is the literal token placed in the emailed invite link
- `profile_id` (uuid, FK → `profiles.id`, not null) — must reference a profile where `profile_type = 'human'` (enforced at the application layer — dogs cannot be invited)
- `email` (text, not null) — address the invite was sent to
- `created_at` (timestamptz)

**Flow:** a profile's controller clicks "Send Invite" (only shown/allowed for `profile_type = human` profiles with `login_id IS NULL`) → a row is inserted and an email is sent containing a link with the guid → recipient clicks the link → registration screen reads the guid from the query string → on submit, the invite is looked up by guid, a new `logins` row is created from the submitted credentials, that login's id is written to `profiles.login_id` on the referenced profile, and the invite row is deleted. Nothing else in the schema changes — the profile's `relationships` rows (created back when it was first made) are untouched and remain valid, since they were never tied to login state.

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

### 3.9 `sessions`
Backs the hand-rolled auth described in §2. A session is a random 32-byte token; only its hash is ever persisted, so a database read alone can't be used to hijack a live session.
- `id` (uuid, PK)
- `login_id` (uuid, FK → `logins.id`, not null, `ON DELETE CASCADE`)
- `token_hash` (text, not null, unique) — SHA-256 hex digest of the raw session token; the raw token itself lives only in the httpOnly cookie
- `expires_at` (timestamptz, not null) — 30 days from creation, fixed (not sliding) in M1
- `created_at` (timestamptz)

Deactivating a login deletes all of its `sessions` rows immediately (real revocation). `getSession()` also re-checks `logins.status = 'active'` on every read as defense in depth.

### 3.10 `password_reset_tokens`
Same hash-token pattern as `sessions`, single-use.
- `id` (uuid, PK)
- `login_id` (uuid, FK → `logins.id`, not null, `ON DELETE CASCADE`)
- `token_hash` (text, not null, unique) — SHA-256 hex digest of the token emailed to the user
- `expires_at` (timestamptz, not null) — 1 hour from creation
- `created_at` (timestamptz)

A successful reset deletes all outstanding reset-token rows for that login (not just the one used) and all of that login's `sessions` rows, so a password reset also logs out every existing session. This applies equally whether the reset was self-service or admin-initiated (§6, M1).

---

## 4. AWS Architecture Overview

```
GitHub Actions (CI/CD, OIDC role)
   │  run drizzle-kit migrate against Postgres, then
   │  docker push → Lightsail's built-in private registry
   ▼
Lightsail Container Service: aberpack-service
   │  PublicDomainNames → AWS::Lightsail::Certificate (theabernathypack.com)
   │  DNS: Route53 (existing hosted zone) → Lightsail service's public endpoint
   │  runtime AWS access via the service's default container role
   ▼
SSM Parameter Store: /aberpack/prod/*
   │
   ├──► Neon/Supabase Postgres (external, connection string in SSM)
   └──► S3: aberpack-photos-bucket (avatars/photos, presigned URLs)

EventBridge Scheduler (daily) ──► Lambda: aberpack-retention-cleanup ──► Postgres
```

No VPC / private networking is required — Neon/Supabase is reached over the public internet via SSL. This keeps the infrastructure simpler and cheaper.

---

## 5. AWS Services Inventory & Starting IAM Policy

### 5.1 Services used

| Service | Purpose | Naming |
|---|---|---|
| CloudFormation | IaC deployment | Stack: `aberpack-stack` |
| S3 | Avatar/photo storage | `aberpack-photos-bucket` |
| Lightsail (Container Service) | App hosting/compute + built-in image registry | `aberpack-service` |
| Lightsail (Certificate) | TLS certificate for the custom domain, referenced by the container service | `aberpack-cert` |
| IAM | Lambda execution role, GitHub OIDC deploy role. (Lightsail's own container-service runtime role is managed by Lightsail itself, not created in this policy.) | `aberpack-*-role` |
| Route53 | DNS record(s) in the existing hosted zone, pointed at the Lightsail service's public endpoint | Existing hosted zone, not created by this stack |
| SSM Parameter Store | Secrets/config (DB URL, session secret, Gmail app password) | `/aberpack/prod/*` |
| Lambda | Scheduled retention cleanup | `aberpack-retention-cleanup` |
| EventBridge Scheduler | Daily trigger for the cleanup Lambda | `aberpack-retention-schedule` |
| CloudWatch Logs | Lambda logs (Lightsail container logs are retrieved via `lightsail:GetContainerLog`, not a CloudWatch log group) | Auto-created log group under `/aws/lambda/aberpack-*` |

### 5.2 Starting IAM policy for the `ashley-dev` role

This is the policy the local deploy role needs to author and deploy the CloudFormation stack(s) above. It is scoped to `aberpack*`-named/tagged resources wherever the resource type supports it. Replace `<ACCOUNT_ID>`, `<REGION>`, and `<HOSTED_ZONE_ID>` before attaching.

**Note (confirmed during M0):** the actually-deployed policy lives in `aws/iam/theabernathypack-dev-role-policy.json` (gitignored, account-specific) and is the one to trust over the draft below — it required live corrections during M0 (see the Lightsail resource-scoping note). The JSON below is the pre-deploy draft, preserved for context on original intent.

If this exceeds the managed-policy size limit, split it into two policies along the marked boundary (`aberpack-deploy-core` and `aberpack-deploy-iam`) — separating IAM self-management permissions from resource-provisioning permissions is good practice regardless.

**Flagged for verification in M0, not asserted with full confidence:** Amazon Lightsail has a long-documented history of inconsistent resource-level ARN support across its IAM actions (many Lightsail actions have historically required `"Resource": "*"` rather than supporting scoping to a specific resource ARN). The `LightsailContainerAndCertificate` statement below is written scoped to `aberpack*` resources on the assumption this is supported; confirm against the current AWS Service Authorization Reference for Lightsail during M0 and widen to `"Resource": "*"` for that statement if scoping isn't actually honored — don't let an incorrectly-scoped policy block the whole M0 deploy. **(Resolved in M0: scoping is not supported for Lightsail's certificate ARNs — the deployed policy uses `Resource: "*"` for the Lightsail statement.)**

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
        "cloudformation:GetTemplateSummary",
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
      "Sid": "CloudFormationListLevel",
      "Effect": "Allow",
      "Action": [
        "cloudformation:ListStacks",
        "cloudformation:ValidateTemplate"
      ],
      "Resource": "*"
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
      "Sid": "LightsailAll",
      "Effect": "Allow",
      "Action": [
        "lightsail:CreateContainerService",
        "lightsail:UpdateContainerService",
        "lightsail:DeleteContainerService",
        "lightsail:GetContainerServices",
        "lightsail:CreateContainerServiceDeployment",
        "lightsail:CreateContainerServiceRegistryLogin",
        "lightsail:RegisterContainerImage",
        "lightsail:GetContainerImages",
        "lightsail:GetContainerLog",
        "lightsail:CreateCertificate",
        "lightsail:GetCertificates",
        "lightsail:DeleteCertificate",
        "lightsail:TagResource"
      ],
      "Resource": "*"
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
      "Resource": "arn:aws:logs:<REGION>:<ACCOUNT_ID>:log-group:/aws/lambda/aberpack-*"
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
            "lambda.amazonaws.com",
            "scheduler.amazonaws.com"
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

**Note:** Lightsail Container Service's default runtime role (used by the running app to reach S3/SSM at runtime) is managed by Lightsail itself, not created as a standalone `AWS::IAM::Role` resource in the template the way App Runner's roles would have been. Wiring this role's access to the S3 bucket/SSM parameters is still an open item — see §8.

**Note:** `iam:PassRole` no longer needs an App Runner service principal — Lightsail Container Service's runtime role isn't passed via a CloudFormation-authored `PassRole` the way App Runner's was. Only `lambda.amazonaws.com` (the retention Lambda's execution role) and `scheduler.amazonaws.com` (EventBridge Scheduler invoking that Lambda) remain.

---

## 6. Milestones

Each milestone is independently shippable/testable. Order reflects dependencies.

### M0 — Foundation: App Scaffold & AWS Bootstrap ✅ Complete
- Initialize the Next.js app (App Router, TS, Tailwind, Shadcn UI) inside this repo, with `output: 'standalone'` set in `next.config.js`.
- Set up Drizzle ORM, initial schema migration for all tables in Section 3.
- Provision the Postgres database (Neon, `us-east-1`) and store the connection string in SSM / `.env`.
- Author the CloudFormation stack(s): S3 bucket, Lightsail container service (`aberpack-service`, initially serving a placeholder image), `AWS::Lightsail::Certificate` for theabernathypack.com referenced via the service's `PublicDomainNames`, Route53 record(s) pointed at the Lightsail service's public endpoint, SSM parameters, Lambda + EventBridge Scheduler skeleton.
- Attach the Section 5.2 policy to `theabernathypack-dev-role`; resolve the resource-level-scoping question flagged in 5.2 for the Lightsail statement.
- **Acceptance:** `https://theabernathypack.com` resolves over HTTPS to a running (placeholder) Lightsail container; CloudFormation stack deploys cleanly from a clean AWS account state. **Met.**

### M1 — Auth & Login Entity ✅ Complete
- `logins`, `sessions`, and `password_reset_tokens` tables (§3.1, §3.9, §3.10).
- Hand-rolled credentials auth (no Auth.js — see §2): registration, login, logout, password reset (emailed token via Nodemailer/Gmail OAuth2), account deactivation.
- Session mechanism: random 32-byte token, SHA-256 hash stored in `sessions`, raw token in an httpOnly/secure/sameSite=lax cookie, 30-day fixed expiry. `getSession()` re-checks `status = 'active'` on every read.
- Deactivation deletes all of that login's `sessions` rows immediately (real revocation, not just a block on future logins).
- Password reset: 1-hour single-use token (same hash-token pattern as sessions); a successful reset deletes all outstanding reset tokens and all sessions for that login.
- No global route-protection middleware/proxy in M1 — `/account` and `/admin` are page-level `getSession()`/`requireAdmin()` + `redirect()` checks. (Next.js 16 renamed `middleware.js` to `proxy.js`; revisit with a real `proxy.ts` once M2+ adds more protected routes.)
- Minimal server-rendered header (Login/Register vs. Account/Admin links) added to the root layout so the flow is reachable in a browser — not the real responsive nav, which is M6 scope.
- **`role` column + admin capability, added in v5:** `logins.role` (`member`/`admin`); `requireAdmin()` helper (redirects anonymous visitors to `/login`, non-admin logins to `/account`); `/admin` page where an admin can reset any user's password by email, which also invalidates that user's existing sessions (same as a self-service reset). First admin is promoted manually via SQL — no promotion UI (see §3.1 note).
- **Acceptance:** a user can register, log in, log out, reset a forgotten password, and deactivate their account; a deactivated login cannot log in. **Added in v5:** a login with `role = 'admin'` can reset any other user's password from `/admin`, the target user's existing sessions are invalidated, and a non-admin visiting `/admin` is redirected away.

### M2 — Profile Architecture & Invites
- Auto-create a Base Profile on registration (a `profiles` row with `login_id` set to the new login, and `creator_id` pointing at itself).
- CRUD for Relationship Profiles (dog/kid/partner/etc.), enforcing the edit rule from Section 3.2 (creator only, until converted).
- Avatar upload (S3 presigned PUT) and curated default-avatar picker (separate sets for humans/dogs).
- Invite flow per Section 3.4: "Send Invite" button shown only for `profile_type = human` profiles with no `login_id`; creates an `invites` row and emails the guid link; registration screen accepts the guid, creates the `login`, sets `profiles.login_id` on the target profile, deletes the invite row.
- **Acceptance:** create/edit/delete dog and kid/partner profiles; upload and change an avatar; send an invite, register via the link, and confirm the profile now shows the new login as its sole editor with no other side effects.
- **Admin note (v5):** no admin profile-moderation capability is planned by default (e.g., admin editing/deleting someone else's profile) — only add it here if a concrete need shows up while building M2; don't pre-build it speculatively.

### M3 — Relationships & "My Pack"
- `relationships` table and the create/remove permission rules from Section 3.3.1–3.3.2.
- UI for adding/removing a relationship edge from a profile's management screen (subject to the permission rules — e.g., only a non-base profile's controller can attach it to something else).
- "My Pack" view: the single-join query from Section 3.3.3 — no separate aggregation logic, no distinction between "profiles I created" and "profiles I'm connected to."
- **Acceptance:** create a family (base profile + kid + dog), invite a partner and confirm their pack still shows the family correctly with no extra steps needed after conversion; simulate a severance (e.g., remove one profile's edge to the dog) and confirm only that specific edge disappears, others remain.
- **Admin note (v5):** same as M2 — no admin relationship-moderation capability planned by default; add only if a concrete need shows up here.

### M4 — Event CRUD & Location/Category Rules
- `events` table, "Create New Event" flow, edit/delete by creator.
- Category dropdown (fixed list + "Other" with optional free-text suggestion).
- Location validation: at least one of the three fields required, enforced in the form and via a DB `CHECK` constraint.
- **Admin capability (v5, this is the deferred item from the M1.5 discussion):** an admin can delete any event regardless of creator, using the same `requireAdmin()` gate established in M1. This is the concrete "delete events" admin task that prompted the v5 revision — implement it here, when the `events` table actually exists, rather than earlier.
- **Acceptance:** create/edit/delete an event; submitting with all three location fields empty is rejected; "Other" category accepts a suggestion; an admin can delete any event, not just their own.

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
- GitHub Actions: lint + test on PR. On merge to `main`: run `drizzle-kit migrate` against the production DB (connection string pulled from SSM via the GitHub OIDC role) as its own step; if that succeeds, build the Docker image and push it to the Lightsail container service's private registry (`aws lightsail push-container-image` / `create-container-service-registry-login` + `RegisterContainerImage`); then create a new container service deployment referencing the pushed image.
- GitHub OIDC IAM role (`aberpack-github-deploy-role`) — no long-lived AWS access keys stored in GitHub.
- **Acceptance:** a merge to `main` results in an automatic, successful production deployment with no manual AWS CLI steps, and a failed migration blocks the deploy rather than shipping a broken schema.

---

## 7. Explicitly Out of Scope (Deferred)

Per the brief, not part of this milestone set:
- SSO/OAuth login (Google, etc.) — this is also now the trigger for reconsidering Auth.js/NextAuth, since OAuth is the case it's designed for
- Push/email notifications and reminders
- Approval/consent workflow for relationship edges (currently auto-approved per Section 3.3.1 — notifications + approval are a planned future addition, not an oversight)
- Automated content moderation
- In-app suggestion box + Jira integration + Claude Code PR automation pipeline
- Real-time (WebSocket) chat
- CloudFront in front of S3 (may be added later without app-code changes)
- **(v5)** A real multi-feature admin dashboard UI (user list, event list, etc.) — `/admin` is a single password-reset form for now; revisit consolidating into a proper dashboard once M4 adds its own admin action and there's enough surface area to justify shared UI
- **(v5)** Admin promotion UI (making another login an admin from within the app) — stays a manual SQL step; not worth building for a single-operator project

---

## 8. Open Risks / Engineering Notes Carried Into Build

1. **Lightsail IAM resource-level scoping** — resolved in M0: Lightsail certificate ARNs don't support name-based scoping, so the deployed policy uses `Resource: "*"` for the Lightsail statement (see §5.2).
2. **Lightsail container runtime role wiring** — still open. The container service's default runtime role (needed for S3/SSM access at runtime) isn't wired yet; not required for M0's placeholder or M1's auth work (no runtime AWS calls from the app yet), but blocks M2's avatar upload (S3) and any milestone that fetches secrets at runtime rather than build/deploy time.
3. **IAM policy size** — the Section 5.2 policy may need to be split into two managed policies (core resources vs. IAM/PassRole) to stay under the managed-policy size limit; not needed yet, current policy is well under the size limit.
4. **DB vendor pick** — resolved: Neon, `us-east-1`, direct (non-pooled) connection string.
5. **Multi-creator relationship edges** — Section 3.3.1 doesn't yet support linking two non-base profiles that have two *different* creators (e.g., two separately-created ephemeral profiles). Not needed for any current milestone, but noted in case it comes up.
