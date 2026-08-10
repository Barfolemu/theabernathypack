# IAM policy files

`theabernathypack-dev-role-policy.json` is the **scrubbed, committed
reference** for the policy attached to `theabernathypack-dev-role` in the
AWS console — account ID replaced with `<ACCOUNT_ID>` throughout. It
documents current permissions; it is not applied directly to anything.

The AWS account ID itself isn't a secret, but there's no reason to publish
it in a public repo either, so it's kept out of anything committed.

**To make a live change to the role's permissions:**

1. Copy the reference file to a `*.local.json` working copy (gitignored —
   see `.gitignore`'s `aws/iam/*.local.json` rule):
   ```
   cp theabernathypack-dev-role-policy.json theabernathypack-dev-role-policy.local.json
   ```
2. In the working copy, replace `<ACCOUNT_ID>` with the real account ID
   (`aws sts get-caller-identity --query Account --output text` with the
   `theabernathypack` profile, if you don't have it memorized).
3. Edit the working copy, paste it into the IAM console (the user does this
   step manually — the assistant does not have `iam:PutRolePolicy` on
   `theabernathypack-dev-role` itself, only on `aberpack-*`-prefixed roles
   it creates).
4. Once applied, mirror the same statement changes back into the
   `<ACCOUNT_ID>`-scrubbed reference file and commit that.

`aberpack-app-runtime`'s policy (a separate, narrowly-scoped IAM user for
the deployed app's own S3 access — not this dev role) is documented instead
in `aws/cloudformation/README.md`, since it's tied to the CI/CD deploy
story rather than day-to-day dev-role permission changes.
