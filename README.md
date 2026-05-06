# Ambient Space

AI-powered interior design. Upload your room photo, choose a style, and shop real
furniture from the render.

## Stack

- **Frontend** — Vite + React + Tailwind, deployed on Vercel
- **Auth & DB** — Supabase (Postgres + Storage + Auth)
- **AI** — Provider-agnostic via env var:
  - `LLM_PROVIDER` = `gemini` (default, free) | `groq` | `anthropic`
  - `IMAGE_PROVIDER` = `huggingface` (free) | `fal` | `together`
- **Payments** — Stripe Checkout (one-off credit packs)
- **Email** — Resend (transactional + marketing)
- **Rate limiting** — Upstash Redis (free tier)
- **Error tracking** — Sentry (free tier, optional)

## Local development

1. Clone the repository.
2. `cd` into the project directory.
3. Install dependencies: `npm install`
4. Copy `.env.local.example` → `.env.local` and fill in real values.
5. Run the app: `npm run dev`

## Database

Migrations live in `supabase/migrations/`. Run them in order via the Supabase
SQL Editor:

- `0001_initial_schema.sql` — base tables, RLS policies, triggers
- `0002_add_missing_design_fields.sql` — color_palette, vibes, status
  constraint, default created_by
- `0003_furniture_items_ltrb_bbox.sql` — bounding-box columns

## Deployment

Pushes to `main` auto-deploy via Vercel. Required env vars are documented in
`.env.local.example`.
