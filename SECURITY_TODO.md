# Security Hardening — Manual Steps Required

These changes require action in Railway or Vercel dashboards and cannot be done via code.

## Railway (Pipecat service) — Environment variables to add/confirm

| Variable | Value | Why |
|---|---|---|
| `APP_DEBUG` | `false` | Disables auto-generated `/docs`, `/redoc`, and `/openapi.json` endpoints in production |
| `ALLOWED_ORIGINS` | `https://convosparr.com,https://[your-staging-vercel-url]` | Restricts CORS to your Next.js domains only — replace with actual Vercel preview URL |
| `LOG_LEVEL` | `INFO` | Prevents transcript content from appearing in debug logs |

## Vercel (Next.js app) — Environment variables to confirm

| Variable | Value | Why |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://convosparr.com` | **Required** — the app now throws an error in production if this is unset (Google OAuth will fail otherwise) |

## Pending staging change — infer_role retry + error UI (staging only, not yet on main)

`src/app/(dashboard)/practice/[scenarioId]/page.tsx` has the following unreleased improvements:
- **Retry logic**: `infer-role` API call retries once on failure (2 attempts total) instead of silently failing
- **Error state**: `inferRoleError` boolean — shows an `AlertCircle` + "Couldn't identify buyer role." message when both attempts fail
- **Retry button**: "Try again" button (`RefreshCw` icon) lets the user manually re-trigger role inference after a failure
- **Reset on clear**: `inferRoleError` is cleared whenever the pitch context is reset

To bring this to `main`, cherry-pick or merge the staging commit that contains this file.

---

## Note for production launch

When the Pipecat service URL changes from `pitch-node-staging.up.railway.app` to the production URL:
1. Update `ALLOWED_ORIGINS` in Railway to include the production Next.js Vercel URL
2. Update `PIPECAT_SERVICE_URL` in Vercel to point to the production service URL
