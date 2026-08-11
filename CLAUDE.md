# Project conventions for Claude

## Merging pull requests

- Never merge a PR unless a human has explicitly asked you to in a comment
  (e.g. "@claude merge this"). Simply being tagged is not authorization to
  merge.
- Before merging, confirm the `CI` check on the PR has passed. If it hasn't,
  say so instead of merging.
- Merging to `main` automatically deploys to production (see
  `.github/workflows/deploy.yml`) - there is no separate deploy step to run
  or mention. Don't imply a deploy is still pending after a merge.

## Working on bugs from Jira

- Jira issue keys look like `ABE-123`. If a PR or branch name references one,
  treat that ticket's linked comments (triage verdict, plan) as authoritative
  context for what the fix should do.
- When fixing a confirmed bug, write a regression test that reproduces it
  before making the fix, per `plans/plan-v5.md`'s testing conventions.

## Code style

- Follow the existing patterns in the file you're editing over introducing a
  new one, even if you'd personally prefer the new one.
- Run `npm run lint` and `npm run build` before considering a change done.
