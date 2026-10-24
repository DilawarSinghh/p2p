# Predictive Circular-Resource Grid — Full Project Documentation

> A judge-facing walkthrough of **what** we built, **what it does**, **which tools**
> power it, and **how** every piece works end to end.

---

## 1. The One-Paragraph Pitch

Campus facilities teams run resource audits building-by-building, by hand. That means
they see waste, water, and electricity data **days late**, can't predict spikes before
they happen (exam rush, mess peaks, fests), and can't say *why* a number moved. We built
an **AI-driven Predictive Circular-Resource Grid** for an 8-building campus that fuses
noisy IoT telemetry, smart-bin sensors, and messy human logs into one live operations
cockpit. It classifies waste at the edge, forecasts demand 6–12 hours ahead, attributes
anomalies to a probable root cause with an explainable recommended action, and closes a
circular + behavioural incentive loop with a Green Score leaderboard — all while staying
correct when buildings drop offline.

---

## 2. The Problem We Solve

The benchmark is a synthetic 8-building campus (academic blocks, hostels, central mess,
lab complex) monitored for **120 days (20 Jun – 17 Oct 2026)**. The problem statement
requires a single system that satisfies **eight constraints simultaneously**:

| # | Constraint | How the product answers it |
|---|---|---|
| ① | Multi-modal sensor fusion under noise | Fuse hourly IoT meters + event-driven smart-bins + shift-based human logs |
| ② | Real-time edge classification (>85%) | RandomForest on 5 physical sensors, run in pure TypeScript, <1 ms/event |
| ③ | Short-horizon forecasting (6–12 h) | Ridge autoregression + seasonal + calendar drivers, with spike warnings |
| ④ | Intermittent connectivity & integrity | Ingestion-lag detection, buffered-burst replay, dedup |
| ⑤ | Root-cause attribution | Z-score anomalies cross-referenced with logs + calendar → ranked action |
| ⑥ | Behavioural + economic incentive loop | Green Score, Green Credits, leaderboard, impact metrics |
| ⑦ | Cost & scale envelope (3 → 30+) | Per-building BOM, ROI, hierarchical federation scaling simulator |
| ⑧ | Failure-mode awareness | Live monitors for sensor drift, credit gaming, concept drift |

---

## 3. What the Product Does (Page by Page)

The app is a 7-page operations dashboard. Each page maps directly to the constraints
above so judges can trace requirement → feature.

| Route | Name | What it shows |
|---|---|---|
| `/` | **Campus Command Center** | Campus KPIs: grid kWh + cost, solar offset, water, CO₂, landfill, diversion rate, data-health counters, resource trend chart, and a full building portfolio table |
| `/telemetry-fusion` | **Telemetry Fusion** | ① + ④ — three async sources at different cadences, ingestion-lag distribution, per-building buffered/duplicate counts, and a buffer→burst-flush replay timeline |
| `/edge-classifier` | **Edge Classifier** | ② — live smart-bin classification, confidence-gated accuracy table, per-class precision/recall, and generated test-stream predictions |
| `/forecasting` | **Forecasting** | ③ — 6–12 h forecast with confidence band, backtest MAE/MAPE, spike warnings, and the accuracy/compute trade-off argument |
| `/root-cause` | **Root Cause** | ⑤ — ranked anomalies with a plain-English probable cause, supporting evidence, and an explainable action with estimated kWh/L/Rs/CO₂ saved |
| `/circular-incentives` | **Circular & Incentives** | ⑥ — Green Score leaderboard, Green Credits, composting loop, and week-over-week impact metrics |
| `/architecture-scale` | **Architecture & Scale** | ⑦ + ⑧ — per-building bill of materials, ROI/payback, a 3→50 building scaling simulator, and three live failure-mode monitors |

A **Campus Facilities Copilot** chat widget is available across the app, and a **Demo
Role Switcher** lets judges instantly flip between the four RBAC personas during the
walkthrough.

---

## 4. The Tools & Tech Stack

### Frontend & App Framework
- **Next.js 15** (App Router) with **React 19** — server components render data-heavy
  pages statically; two API routes run as serverless functions.
- **TypeScript 5.7** — the entire app and the ML inference engine are type-safe TS.
- **Tailwind CSS 3.4** (+ PostCSS, Autoprefixer) — the dark operations-console UI.
- **Recharts** — all trend, bar, and forecast charts.
- **lucide-react** — icons.

### Backend & Data Platform
- **Supabase** — Postgres database, Auth, Row-Level Security (RBAC), and Realtime.
  Schema + policies live in `supabase/migrations/0001_schema.sql` and `0002_rls.sql`.
  The app runs **fully offline on bundled JSON** by default and switches to Supabase
  with one env flag.
- **`@supabase/ssr` + `@supabase/supabase-js`** — server and browser clients.

### Machine Learning
- **Python + scikit-learn** (offline training only) — `RandomForestClassifier` trained
  in `scripts/train_classifier.py`, evaluated with 5-fold stratified out-of-fold CV.
- **pandas / numpy / openpyxl** — ETL from the raw `.xlsx` datasets.
- **Pure-TypeScript inference** — the trained forest is exported to compact JSON and
  re-implemented in TS (`src/lib/classifier.ts`), so **no Python or GPU runs in
  production**. This is the "edge-deployable" story.

### AI Assistant
- **Groq SDK** — the Campus Facilities Copilot uses Groq's hosted `openai/gpt-oss-120b`
  via a server-side route (`/api/chat`) with a domain-scoped system prompt.

### Deployment & Tooling
- **Vercel** — hosting target; static pages are prerendered, `/api/classify*` and
  `/api/chat` run as Node serverless functions.
- **GitHub** — version control and the source of truth for CI/deploys.
- **Node.js** — runtime for the dev server, build, and the Supabase seeder script.

---

## 5. How It Works (Architecture)

```
          RAW DATA (.xlsx, 7 tables)
                   │
   Python ETL  ────┼──── convert_data.py  → src/data/datasets/*.json
   (offline)       │     train_classifier.py → waste_model.json + metrics.json
                   ▼                                   + test predictions .csv
        ┌─────────────────────────────────────────────┐
        │  Next.js 15 (App Router) on Vercel           │
        │                                              │
        │  Server libs (src/lib/*)  ── read JSON ──┐   │
        │   constants · data · classifier · forecast│  │
        │   anomaly · fusion · gamification ·       │   │
        │   resilience                              │   │
        │                                           ▼   │
        │  7 Server/Client pages  ──render──►  Recharts │
        │  /api/classify* (TS inference, serverless)    │
        │  /api/chat  ──► Groq LLM (Facilities Copilot) │
        └───────────────┬──────────────────────────────┘
                        │  (optional, flag-controlled)
                        ▼
              Supabase (Postgres + Auth + RLS + Realtime)
```

### 5.1 Data layer (`src/lib/data.ts`)
A server-only access layer reads the seven bundled datasets from
`src/data/datasets/*.json`, caches each file in module scope, and exposes typed getters
and aggregations (per-building, by-date, calendar maps). The same shapes can be served
from Supabase when `NEXT_PUBLIC_USE_LOCAL_DATA=false`. This is why the demo runs offline
with zero backend.

### 5.2 Single source of truth (`src/lib/constants.ts`)
All mandated engineering constants live in one file and are reused by both the ETL and
the live calculators:
- Grid carbon factor **0.70 kg CO₂/kWh**
- Electricity tariff **Rs. 8.00/kWh**
- Water energy intensity **0.85 kWh / 1,000 L**
- Compost conversion **4 kg wet organic → 1 kg compost**

It also holds the **building alias map** (e.g. `"BH"`, `"Boys Hostle"`, `"B05"` all
resolve to `B05`) and **unit standardization** (`units`→kWh, `kL`→L, `bags`→kg) that
clean the messy human logs.

### 5.3 ② Edge classification (`scripts/train_classifier.py` → `src/lib/classifier.ts`)
- Trained on the 5 physical smart-bin sensors: `weight_g`, `moisture_pct`,
  `metal_signal`, `transparency`, `acoustic_hardness`, across 6 waste classes.
- **Honest numbers (from `metrics.json`):**
  - Raw accuracy **84.9%** (5-fold out-of-fold on 6,314 events).
  - **Confidence-gated accuracy 86.8%** at confidence ≥ 0.5 (≈95% coverage) — items
    below the gate route to a **review bin**, a realistic edge pattern that clears the
    85% target.
  - Inference latency **< 1 ms/event** in TS, far inside the 2-second edge budget.
- The forest is exported as plain threshold-split JSON; the TS engine traverses each
  tree, soft-votes the per-class probabilities, applies the confidence gate, and returns
  the routing destination. Predictions for the 1,601 unlabelled test events are written
  to `public/exports/waste_events_test_predictions.csv`.

### 5.4 ③ Forecasting (`src/lib/forecast.ts`)
A lightweight, edge-friendly model: **closed-form ridge regression** over recent lags
(lag-1, lag-24) plus hour-of-day/day-of-week seasonal profiles and exogenous calendar
drivers (temperature, rainfall, scheduled events, exam flag). It backtests on the last
20% of history to report **MAE/MAPE**, rolls forward 6–12 hours with a confidence band,
and raises a **spike warning** when a predicted hour exceeds its seasonal baseline by
>30%. The choice of ridge over a heavy model is the deliberate accuracy–compute trade-off
for edge deployment.

### 5.5 ④ Fusion & resilience (`src/lib/fusion.ts`)
Fuses three heterogeneous sources sampled at different rates (hourly IoT, event-driven
bins, shift-based logs). It buckets ingestion lag, counts **buffered bursts** and
**duplicate retransmissions** per building, and reconstructs a buffer→flush timeline — so
a building going offline for hours doesn't corrupt the campus dashboard.

### 5.6 ⑤ Root-cause attribution (`src/lib/anomaly.ts`)
Detects statistical anomalies (z-score) in daily summaries, then cross-references the
anomaly window (±1 day) against normalized manual-log notes and calendar events for the
same building. It emits a **plain-English probable cause**, the supporting **evidence**,
and a **ranked action** with estimated kWh / litres / Rs / CO₂ saved — going beyond
graphs to explainable recommendations.

### 5.7 ⑥ Circular economy & gamification (`src/lib/gamification.ts`)
Computes a 0–100 **Green Score** per building (rewarding recycling and solar
self-sufficiency, penalizing contamination and per-capita load), awards **Green Credits**
to clean, high-diversion buildings, ranks a leaderboard, and reports campus **impact
metrics** including compost yield, diversion rate, solar CO₂ offset, and week-over-week
change.

### 5.8 ⑦ + ⑧ Scale & failure modes (`src/lib/resilience.ts` + `ScaleClient.tsx`)
- A per-building **Bill of Materials** (ESP32-S3 nodes, load cells, moisture/metal/optical/
  acoustic sensors, energy + water meters, a Raspberry Pi 4 gateway with local SQLite
  buffer, LoRaWAN) with an ROI/payback estimate.
- A **3→50 building scaling simulator** showing that hierarchical MQTT/LoRaWAN clusters
  (~10 buildings each) plus edge aggregation keep cloud bandwidth linear and tiny — no
  redesign needed.
- Three **live failure-mode monitors**: sensor drift/fouling (B07 food court), adversarial
  credit gaming (heavy-dense drops), and semester-phase concept drift — each with a
  concrete mitigation.

### 5.9 The AI Copilot (`src/app/api/chat/route.ts`)
A server-side route calls Groq's LLM with a domain-scoped system prompt, caps history to
the last 20 turns to protect the context window, and keeps the API key server-only. It
answers facilities questions and, when it lacks a number, points to the data source that
would.

### 5.10 Security & roles (`supabase/migrations/0002_rls.sql`, `src/lib/role-context.tsx`)
Four RBAC roles with Row-Level Security policies:
- **admin** (Sustainability Director) — all buildings, model triggers, config.
- **warden** (Hostel/Mess) — writes manual logs for B05/B06/B07, views alerts/forecasts.
- **technician** (Facility/Lab Engineer) — any log writes, gateway recovery, calibration.
- **student** (Campus Occupant) — leaderboard, building scores, bin simulator.

A Demo Role Switcher in the sidebar flips views instantly for the walkthrough without
re-authenticating.

---

## 6. Why This Is Better

- **Edge-honest ML, not cloud theatre.** Inference is pure TypeScript at <1 ms/event with
  the model shipped as a few-KB JSON file — it genuinely runs on constrained hardware,
  and we report **real out-of-fold accuracy (84.9%)** plus a confidence gate that lifts
  effective accuracy to 86.8% instead of cherry-picking a single-split number.
- **Explanations, not just dashboards.** Every anomaly comes with a cause, evidence, and
  a quantified action — the system justifies each recommendation.
- **Built to degrade gracefully.** Buffered-burst replay and dedup mean a building can go
  dark for hours without corrupting campus-wide numbers.
- **One source of truth.** All mandated constants and messy-data normalization live in a
  single file, so ETL and live math can never disagree.
- **Runs anywhere, instantly.** Zero-backend offline mode for demos; one env flag to
  switch to a real Supabase + Postgres + RLS deployment on Vercel.
- **Scale proven on paper and in UI.** A BOM, ROI, and interactive 3→50 simulator show the
  architecture extends an order of magnitude without redesign.

---

## 7. Run It

### Offline (default, no backend)
```bash
npm install
npm run dev        # http://localhost:3000
```
Reads bundled datasets from `src/data/datasets/` and the model from `src/data/model/`.
Controlled by `NEXT_PUBLIC_USE_LOCAL_DATA=true` in `.env.local`.

### Connect Supabase (optional)
1. Create a Supabase project.
2. Run `supabase/migrations/0001_schema.sql` then `0002_rls.sql`.
3. Fill `.env.local` (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. `npm run seed`, then set `NEXT_PUBLIC_USE_LOCAL_DATA=false`.

### Enable the AI Copilot
Set `GROQ_API_KEY` in `.env.local` (key from https://console.groq.com/keys).

### Regenerate data + model
```bash
python3 -m venv .venv && . .venv/bin/activate
pip install pandas openpyxl scikit-learn numpy
npm run data:build   # convert_data.py + train_classifier.py
```

### Deploy to Vercel
```bash
npx vercel
```
Add the same env vars in the Vercel dashboard.

---

## 8. Project Layout

```
src/app/              7 pages + 3 API routes (chat, classify, classify-test)
src/lib/              constants, data, classifier, forecast, anomaly, fusion,
                      gamification, resilience, role-context, Supabase clients
src/data/datasets/    bundled datasets (JSON)
src/data/model/       exported RandomForest + metrics
supabase/migrations/  Postgres schema + RLS policies
scripts/              Python ETL + training; Node Supabase seeder
public/exports/       waste_events_test_predictions.csv
data/raw/             source .xlsx + problem statement / data guide
```

---

## 9. Tech Stack at a Glance

| Layer | Tools |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript 5.7 |
| UI | Tailwind CSS 3.4, PostCSS, Autoprefixer, Recharts, lucide-react |
| Backend | Supabase (Postgres, Auth, RLS, Realtime), `@supabase/ssr`, `@supabase/supabase-js` |
| ML (offline) | Python, scikit-learn, pandas, numpy, openpyxl |
| ML (runtime) | Pure TypeScript RandomForest inference |
| AI assistant | Groq SDK (`openai/gpt-oss-120b`) |
| Hosting / Ops | Vercel, GitHub, Node.js |
