# aberpack-stack deploy notes

`aberpack-stack.yaml` is deployed with a **two-pass sequence**, not a single
`cloudformation deploy`, because of an ordering constraint discovered during
the first M0 deploy: a `AWS::Lightsail::Container`'s `PublicDomainNames`
cannot reference a certificate that is still `PENDING_VALIDATION`, and a
freshly-created `AWS::Lightsail::Certificate` always starts in that state —
CloudFormation alone can't express "wait for DNS validation to complete."

## Pass 1 — everything except the domain binding

Deploy with `PublicDomainNames` omitted from `AberpackContainerService` and
the `ApexDnsRecord` resource absent. This creates the S3 bucket, the
certificate (PENDING_VALIDATION), the container service (reachable at its
default `*.cs.amazonlightsail.com` domain), and the Lambda/Scheduler
skeleton.

## Bootstrap the certificate's DNS validation record

```
aws lightsail get-certificates --certificate-name aberpack-cert \
  --include-certificate-details --region us-east-1
```

Read `certificateDetail.domainValidationRecords[0].resourceRecord`
(`name`/`type`/`value`) and add it to the `theabernathypack.com` hosted zone
as a CNAME (`route53 change-resource-record-sets`). Lightsail attempts to
create this record itself and will report
`dnsRecordCreationState: FAILED — User not authorized` — that's Lightsail's
own internal automation, unrelated to `theabernathypack-dev-role`; adding it
manually via our own Route53 permissions is expected.

Poll `certificateDetail.status` until it flips to `ISSUED` (typically a few
minutes after the CNAME propagates).

## Pass 2 — bind the domain

Add `PublicDomainNames` back to `AberpackContainerService` and add the
`ApexDnsRecord` resource (an `A`/Alias record using Lightsail's fixed
per-region alias hosted zone ID — `Z06246771KYU0IRHI74W4` for `us-east-1` —
and the container service's `Url` output with the `https://` scheme and
trailing slash stripped via `Fn::Select`/`Fn::Split`). Redeploy.

Future stack updates that don't touch the certificate or domain binding can
just be single-pass `cloudformation deploy` runs against the full template
as-is.

## Deploying the retention-cleanup Lambda's code (M5+)

The Lambda's `Code` points at an S3 object (`aberpack-photos-bucket`,
key `lambda/retention-cleanup.zip`) rather than an inline `ZipFile`, because
it needs `pg` and `@aws-sdk/client-ssm` bundled — neither ships in the base
Lambda runtime image, and inline `ZipFile` has a 4KB/no-dependencies limit.

To ship a code change:

```
cd aws/lambda/retention-cleanup
npm install --omit=dev
rm -f retention-cleanup.zip
zip -r -X retention-cleanup.zip index.mjs package.json node_modules
aws s3 cp retention-cleanup.zip s3://aberpack-photos-bucket/lambda/retention-cleanup.zip
```

Then either `aws cloudformation deploy` (only actually redeploys the Lambda
if some other property in the template also changed — CloudFormation doesn't
hash-check external S3 content on its own) or, for a pure code-only change,
just `aws lambda update-function-code --function-name aberpack-retention-cleanup
--s3-bucket aberpack-photos-bucket --s3-key lambda/retention-cleanup.zip`
directly.

The Lambda fetches the DB connection string itself at runtime via
`ssm:GetParameter` on `/aberpack/prod/database_url` (`WithDecryption: true`)
— **not** a CloudFormation `{{resolve:ssm-secure:...}}` dynamic reference,
because those are only supported for a fixed whitelist of resource
properties (RDS/IAM/ElastiCache passwords, etc.) that does not include
`AWS::Lambda::Function` environment variables. Verified against the current
CloudFormation dynamic-references docs before implementing — this would have
been a wrong (and silently broken) assumption otherwise.

To test a deploy without waiting for the daily `rate(1 day)` schedule:
`aws lambda invoke --function-name aberpack-retention-cleanup --log-type Tail
/tmp/out.json` and read the base64-decoded `LogResult`. Invoking it requires
`lambda:InvokeFunction` on the dev role, which isn't part of the routine
`LambdaRetentionJob` statement — it was added specifically for this kind of
manual verification.

## `aberpack-cicd-stack.yaml` (M7+)

Separate stack from `aberpack-stack.yaml` — see the template's own header
comment for why. Deployed once via the standard change-set review sequence
(`create-change-set --change-set-type CREATE` → `describe-change-set` → user
approval → `execute-change-set`), same pattern as any other real AWS change
on this project. It only needs redeploying if the deploy role's permissions
change, or if the repo is ever renamed/transferred (which would change its
`repo:OWNER@OWNER_ID/REPO@REPO_ID` OIDC subject and require updating the
trust policy's `sub` condition).

**Only one GitHub OIDC provider (`token.actions.githubusercontent.com`) can
exist per AWS account.** If another project sharing this AWS account also
wants GitHub Actions OIDC, it must reuse `GitHubActionsOidcProvider` from
this stack rather than declare its own, or stack creation will fail with an
"already exists" error.

The actual app deploy (`.github/workflows/deploy.yml`) runs
`aws lightsail push-container-image`, which shells out to a separate
`lightsailctl` plugin binary that does its own AWS credential resolution —
it does not honor `AWS_PROFILE`/assume-role profile chains the way the `aws`
CLI itself does. When testing this locally (not needed in CI, where
`aws-actions/configure-aws-credentials` already exports plain
`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_SESSION_TOKEN`), use
`eval "$(aws configure export-credentials --profile theabernathypack --format env)"`
first so `lightsailctl` sees plain env-var credentials instead.

## `aberpack-app-runtime` IAM user (M7+, manual — not in CloudFormation)

Lightsail Container Services have no runtime IAM role or metadata endpoint,
so the *running app container* (not the CI/CD pipeline — that's the
`aberpack-github-deploy-role` above) needs its own credentials for S3
avatar uploads, baked into the container's environment at deploy time
alongside `DATABASE_URL`. This is a long-lived IAM user + access key, which
is deliberately **not** provisioned via CloudFormation or the assistant's
own AWS access — creating IAM users (as opposed to roles) is a boundary the
project owner wants to do manually themselves. If this user is ever lost
and needs recreating:

1. IAM console → Users → Create user → name `aberpack-app-runtime`, no
   console access (programmatic only).
2. Attach this inline policy (scoped to exactly what `lib/s3.ts` needs —
   avatar upload/view under the `avatars/` prefix only):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "AvatarUploadsOnly",
         "Effect": "Allow",
         "Action": ["s3:GetObject", "s3:PutObject"],
         "Resource": "arn:aws:s3:::aberpack-photos-bucket/avatars/*"
       }
     ]
   }
   ```

3. Create an access key (use case: "Application running outside AWS", or
   "Other" if that option isn't offered — it's genuinely meant to be
   long-lived here).
4. Store it in SSM (SecureString), overwriting the existing parameters if
   rotating:

   ```
   aws ssm put-parameter --name /aberpack/prod/aws_access_key_id --type SecureString --value "..." --overwrite
   aws ssm put-parameter --name /aberpack/prod/aws_secret_access_key --type SecureString --value "..." --overwrite
   ```

`deploy.yml` reads these two parameters (plus `database_url`,
`email_from`, `google_client_id`, `google_client_secret`,
`google_refresh_token`, `app_url` — all under `/aberpack/prod/*`, all
readable by `aberpack-github-deploy-role`) and bakes them into the
container's `environment` block on every deploy — no redeploy of this
stack is needed after rotating the key, just the next push to `main`.
