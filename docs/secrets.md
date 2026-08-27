# Keeping API keys secret in HITR

> Audience: you (the user) and any future agent. Read before adding the FortyGuard key or ANY key.

---

## The one rule

**A key is only secret if it never leaves the server.**

```
Everyone's phone/browser          YOUR backend only             FortyGuard
┌───────────────────┐   /api/...  ┌──────────────────┐   https   ┌───────────┐
│  HITR frontend    │ ──────────► │  FastAPI backend │ ────────► │ Temp API  │
│  (public code —   │             │  holds the key   │           └───────────┘
│   NO keys here)   │ ◄────────── │  in an ENV VAR   │
└───────────────────┘  temps only └──────────────────┘
```

The browser only ever receives temperatures. The key stays inside the backend
process, read from an environment variable. Nobody can see it in the app, in
devtools, or in the repo.

## Why the frontend can NEVER hold a key

Everything in `frontend/` gets bundled into JavaScript that is downloaded by
every visitor. Anything there is public — especially variables named
`VITE_...` (Vite literally bakes them into the bundle). Even obfuscated keys
in frontend code can be extracted in seconds. So: **no keys in `frontend/`, no
`VITE_` secrets, ever.**

## The two safe homes for the FortyGuard key

### 1. Local testing (your laptop): `backend/.env`

```bash
cp backend/.env.example backend/.env
# then edit backend/.env:
#   FORTYGUARD_API_KEY=your_real_key_here
```

- `backend/.env` is **gitignored** (verified: `.gitignore` line `.env`), so it
  can never be committed by accident.
- The backend reads it automatically via pydantic-settings (`app/config.py`).
- When the key is present, `HEAT_PROVIDER=auto` switches from the mock model
  to the real provider by itself. No code change needed.

### 2. Production (Vercel dashboard): Environment Variables

Do this from a phone browser if you like:

1. Log in at **vercel.com** → open the **backend** project.
2. **Settings → Environment Variables**.
3. Name: `FORTYGUARD_API_KEY` · Value: your key · Environments: Production
   (and Preview if you want test builds to use real data too).
4. Save, then **Redeploy** (Deployments → ⋯ → Redeploy) so the running
   serverless functions pick it up.

Vercel stores these encrypted; they are injected into the backend at runtime
and never appear in the git repo or in the frontend. Free tier includes this.

## What NOT to do (each of these leaks the key)

| ❌ Don't | Why |
|---|---|
| Put the key in any file under `frontend/` | The JS bundle is public |
| Use a `VITE_FORTYGUARD_...` variable | Vite embeds it in the public bundle |
| Commit `backend/.env` to git | The repo is public on GitHub |
| Paste the key into chat / issues / commits / screenshots | Chat & GitHub are not secret stores |
| Hardcode it in `fortyguard_client.py` | Code gets copied around; git history keeps it forever |

## If a key ever leaks

1. **Rotate it** — generate a new key at FortyGuard (and Supabase/Gemini if
   needed). This is the only reliable fix.
2. Update the stored value (Vercel env var / local `.env`).
3. Optionally remove it from git history (`git filter-repo`) — but rotation
   alone already makes the old key harmless.

## Current status in this repo

- `backend/.env.example` — committed **template** with empty values (safe).
- `backend/.env` — your real local secrets (gitignored, does not exist in git).
- `frontend/.env.example` — only `VITE_API_TARGET` (a local dev URL, not a
  secret; safe).
- `app/config.py` — `fortyguard_api_key` field; `use_mock_heat` auto-switches
  to the real provider only when the key exists.
- `services/fortyguard_client.py` — the only place the key is used; raises a
  clear error if called without one.

## Note on the public-but-public pattern (Supabase publishable key)

Some services (Supabase) give a *publishable/anon* key that is designed to be
public and is safe in the frontend **only together with row-level security**.
That is still not wired in HITR. Until then: treat every Supabase key as a
backend secret. The **service/secret key is always sensitive**.
