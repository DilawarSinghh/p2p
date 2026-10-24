# Predictive Circular-Resource Grid — Multi-Building Campus (P2P 2026)

An AI-driven resource grid for an 8-building campus monitored over 120 days
(20 Jun – 17 Oct 2026). Fuses IoT telemetry, smart-bin sensors, and noisy human
logs to classify waste at the edge, forecast demand spikes, attribute anomalies
to root causes, and close circular + behavioural incentive loops.

Built for **Vercel** (Next.js 15 App Router) + **Supabase** (Postgres, Auth/RBAC,
Realtime). Runs fully offline on bundled datasets out of the box.

## What's inside (maps to the 8 competition constraints)

| Page | Constraint |
|---|---|
| `/` Command Center | Campus KPIs, costs, CO₂, data health |
| `/telemetry-fusion` | ① Multi-modal fusion · ④ Intermittent connectivity + buffer replay |
| `/edge-classifier` | ② Real-time edge classification (>85% gated) + test predictions |
| `/forecasting` | ③ 6–12h forecasting + edge accuracy/compute trade-off |
| `/root-cause` | ⑤ Anomaly detection + explainable ranked actions |
| `/circular-incentives` | ⑥ Gamification: Green Score, credits, impact metrics |
| `/architecture-scale` | ⑦ BOM & 3→30+ scaling · ⑧ 3 failure-mode monitors |

## The ML model (honest numbers)

- **RandomForest** on the 5 physical smart-bin sensors, trained offline in Python
  (`scripts/train_classifier.py`), exported to portable JSON, and run in **pure
  TypeScript** server-side — no Python or cloud GPU at runtime.
- **Raw accuracy: 84.9%** (5-fold out-of-fold). The paper↔plastic sensor overlap
  is an irreducible ceiling for tree ensembles here (verified against ExtraTrees,
  HistGradientBoosting, and engineered features).
- **Confidence-gated accuracy: 86.8%** at conf ≥ 0.5 (96% coverage) — low-confidence
  items route to a review bin, which is a realistic edge pattern and clears the
  85% target. Coverage/accuracy table is shown live on `/edge-classifier`.
- Inference latency < 1 ms/event (well inside the <2s edge budget).
- Predictions for the 1,601 test events: `public/exports/waste_events_test_predictions.csv`.

## Quick start (runs offline)

```bash
npm install
npm run dev      # http://localhost:3000
```

The app reads bundled datasets from `src/data/datasets/` and the model from
`src/data/model/`, so it works with no backend. `NEXT_PUBLIC_USE_LOCAL_DATA=true`
in `.env.local` controls this.

## Connect Supabase (optional)

1. Create a Supabase project.
2. Run the SQL in `supabase/migrations/0001_schema.sql` then `0002_rls.sql`
   (SQL Editor, or `supabase db push`).
3. Copy your keys into `.env.local` (see `.env.example` for the exact fields):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
4. Seed the database:
   ```bash
   npm run seed
   ```
5. Set `NEXT_PUBLIC_USE_LOCAL_DATA=false` to read from Supabase.

### RBAC roles
`admin` · `warden` (B05/B06/B07 log writes) · `technician` (any log writes +
gateway/calibration) · `student` (leaderboard + bin simulator). RLS policies are
in `0002_rls.sql`. A **Demo Role Switcher** in the sidebar lets judges flip views
instantly during the walkthrough.

## Regenerate data + model

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install pandas openpyxl scikit-learn numpy
# place the 7 source files in data/raw/ (xlsx), then:
npm run data:build   # convert_data.py + train_classifier.py
```

## Deploy to Vercel

```bash
npx vercel
```

Add the same env vars in the Vercel dashboard. All pages are statically
prerendered; the two `/api/classify*` routes run as Node serverless functions.

## Engineering constants (single source of truth: `src/lib/constants.ts`)

- Grid carbon factor: 0.70 kg CO₂/kWh
- Electricity tariff: Rs. 8.00/kWh
- Water energy intensity: 0.85 kWh/1000 L
- Compost conversion: 4 kg wet organic → 1 kg compost
- Building alias map + unit standardization (units/kWh→kWh, kL→L, bags→kg)

## Project layout

```
src/app/            7 pages + 2 API routes
src/lib/            constants, data access, classifier, forecast, anomaly,
                    gamification, resilience, fusion, Supabase clients
src/data/           bundled datasets (JSON) + exported model
supabase/migrations SQL schema + RLS
scripts/            Python ETL + training; Node seeder
public/exports/     waste_events_test_predictions.csv
```
