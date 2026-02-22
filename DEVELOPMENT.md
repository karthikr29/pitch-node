# Local Development

## Prerequisites

Ensure both `.env.local` (frontend) and `pipecat-service/.env` (backend) are filled in. See the `.env.example` files in each location for required keys.

---

## Starting the Backend (Pipecat/FastAPI)

```bash
cd pipecat-service
source venv/bin/activate
uvicorn app.main:app --reload
```

Runs on `http://localhost:8000`. Verify with: `http://localhost:8000/health`

---

## Starting the Frontend (Next.js)

In a separate terminal, from the project root:

```bash
npm run dev
```

Runs on `http://localhost:3000`.

---

## Environment Variables

### `pipecat-service/.env`
| Variable | Description |
|---|---|
| `LIVEKIT_URL` | LiveKit server URL (`wss://...`) |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `DEEPGRAM_API_KEY` | Speech-to-text |
| `CARTESIA_API_KEY` | Text-to-speech |
| `OPENROUTER_API_KEY` | LLM routing |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (staging only) |
| `PIPECAT_SERVICE_API_KEY` | Shared secret — must match frontend |

### `.env.local`
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit server URL |
| `PIPECAT_SERVICE_URL` | `http://localhost:8000` |
| `PIPECAT_SERVICE_API_KEY` | Shared secret — must match backend |

> **Supabase:** Always use the **staging** project (`pitch-node-staging`) for local dev. Never connect to production.
