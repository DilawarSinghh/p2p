# Predictive Circular-Resource Grid
### An AI-assisted operations cockpit for campus energy, water, and waste

**Project:** Prompt to Product (P2P) 2026  
**Scope:** 8 simulated campus buildings · 120-day benchmark period  
**Stack:** Next.js 15 · React 19 · TypeScript · Supabase · Python/scikit-learn · Groq  
**Purpose:** Turn disconnected campus resource records into understandable signals, forecasts, explanations, and action priorities.

> **Important data note:** The bundled benchmark is synthetic/hypothetical campus telemetry, not a claim of live sensor deployment at a real campus. The dashboard demonstrates how the proposed system would work against this benchmark. Hardware cost and scale scenarios are estimates/design simulations, not procurement quotes or proof of a 30-building production rollout.

---

## 1. The problem—in plain language

A campus uses electricity and water and produces several types of waste across classrooms, hostels, laboratories, and dining areas. When records are collected manually and reviewed building by building, the facilities team may notice a problem only after costs or waste have already increased.

A conventional dashboard can show *what happened*. It often does not tell a facilities team:

- Which buildings are driving resource use or landfill output?
- Is a reading a real change, a delayed upload, a duplicate, or a messy manual entry?
- What demand or waste spike may happen in the next 6–12 hours?
- What is a plausible reason for an unusual reading, and what should staff check first?
- How can better sorting and lower resource use be encouraged and measured?

**Our approach:** combine telemetry, smart-bin sensor events, calendar context, and human field logs in one campus operations interface. The prototype calculates campus indicators, classifies waste from five sensor measurements, forecasts near-term resource demand, surfaces explainable anomaly recommendations, and models circular-economy incentives.

## 2. What we built

The product includes an interactive **Project Guide** for judges, seven core operations pages, a data-testing sandbox, an optional Supabase-backed deployment, and a facilities Q&A copilot. Start with `/project-guide` for the problem, solution, requirement-to-feature map, model metrics, limitations, and a suggested two-minute demo.

| Page | What a judge can see | Why it matters |
|---|---|---|
| **Project Guide** — `/project-guide` | Plain-language problem and solution, links to each major feature, challenge mapping, model-metric caveats, and suggested judge walkthrough | Gives judges and first-time visitors the narrative before they explore the detailed dashboards |
| **Campus Command Center** — `/` | Campus-wide electricity, energy cost, solar generation, water, CO₂ estimate, landfill, diversion rate, data-health counters, trends, and building comparison | Establishes the operational picture and highlights where attention may be needed |
| **Telemetry Fusion** — `/telemetry-fusion` | IoT streams, smart-bin events, manual records, ingestion lag, buffered bursts, duplicates, and replay timeline | Demonstrates how the system reasons about asynchronous and delayed records |
| **Edge Classifier** — `/edge-classifier` | Smart-bin sensor inputs, six predicted waste categories, confidence, routing destination, model metrics, and test predictions | Makes the model’s input, decision, and low-confidence handling visible |
| **Forecasting** — `/forecasting` | Short-horizon predictions, uncertainty band, backtest metrics, and spike warnings | Moves the interface beyond historical monitoring |
| **Root Cause** — `/root-cause` | Ranked anomalies, probable cause, supporting evidence, and recommended action with estimated impact | Helps staff investigate an issue instead of just viewing a chart |
| **Circular & Incentives** — `/circular-incentives` | Green Scores, Green Credits, building leaderboard, composting/diversion metrics, and week-over-week changes | Connects operational performance with behaviour and circular-resource outcomes |
| **Architecture & Scale** — `/architecture-scale` | Per-building hardware bill of materials, ROI/payback assumptions, scale simulator, and failure-mode monitors | Makes deployment assumptions, growth path, and known risks reviewable |
| **Data Testing Sandbox** — `/data-validation` | Data-validation checks and sample test cases | Lets a reviewer inspect the data-quality testing workflow |

The **Campus Facilities Copilot** is available through the chat widget. A **Demo Role Switcher** lets a presenter inspect role-specific views without a full sign-in flow. These demo controls should be understood as walkthrough aids; production access must be enforced by Supabase Auth and Row-Level Security.

## 3. How a user would use it

1. **Start at the Command Center.** Review the campus totals, building comparison, and data-health counters.
2. **Inspect a signal.** Open Telemetry Fusion to check whether late or duplicated records may explain an apparent change.
3. **Explore an individual waste event.** In Edge Classifier, enter or inspect sensor values and review the predicted class, confidence, and suggested destination. Low-confidence events go to a review route instead of being treated as certain.
4. **Look ahead.** Use Forecasting to review the next 6–12 hours and check whether a predicted value crosses the system’s spike threshold.
5. **Decide what to investigate.** In Root Cause, read the proposed explanation, evidence, and ranked action. Treat this as decision support, not an automatically verified diagnosis.
6. **Track circular outcomes.** Compare diversion, composting, solar contribution, and Green Scores on Circular & Incentives.
7. **Discuss deployment.** Use Architecture & Scale to review the proposed hardware, budget assumptions, growth model, and failure mitigations.

This flow gives the judge a narrative: **observe → validate → classify → forecast → explain → improve → scale**.

## 4. How the system works

```text
Synthetic benchmark files (campus, calendar, telemetry, logs, smart-bin events)
                                  |
                                  v
                       Offline data preparation
                  Python ETL + model training (scikit-learn)
                                  |
                     JSON datasets + model export
                                  |
                                  v
                    Next.js / TypeScript application
          +-----------------------+-------------------------+
          |                       |                         |
          v                       v                         v
 Resource indicators        ML / analytics             User interface
 and normalization         classification,             charts, tables,
                           forecasts, anomaly          explanation views
                           evidence, incentive
          |                       |                         |
          +-----------------------+-------------------------+
                                  |
                     Optional persistence/services
                                  |
                 Supabase Postgres, Auth, RLS, Realtime
                 Groq API for the facilities copilot
```

**Offline-first demo:** by default the app reads its bundled JSON datasets and model, so a judge can explore the prototype without configuring a database. Supabase is an optional connected mode controlled by environment variables. The chat copilot requires a Groq API key.

### Data preparation and quality handling

The repository includes CSV benchmark files under `data/csv/`, converted JSON datasets under `src/data/datasets/`, an offline training script, the exported model, and test-event prediction exports. Data utilities standardize building aliases and common units so records like `Boys Hostle` / `BH` and units such as kL, L, kWh, and bags can be handled consistently. The fusion view visualizes arrival lag, duplicates, and buffered-burst patterns present in the benchmark.

**What “offline-first” means here:** the prototype can render its bundled dataset without a live sensor network. It does not mean physical gateways have been deployed or that real-time live telemetry is being received in this repository as configured by default.

## 5. The machine-learning component

### Waste classification

The training pipeline uses a **Random Forest** trained in Python/scikit-learn and exports the forest into JSON. Runtime inference is implemented in TypeScript in `src/lib/classifier.ts`; it does not need Python or a cloud GPU for each prediction.

Five sensor features are used:

- `weight_g` — load-cell weight
- `moisture_pct` — moisture reading
- `metal_signal` — inductive metal response
- `transparency` — optical transmission
- `acoustic_hardness` — impact/vibration response

The six output classes are **food organic, paper/cardboard, plastic, glass, metal, and e-waste**. The model returns per-class probabilities, a top class, confidence, routing destination, and measured inference latency. A confidence gate sends uncertain events to a review route.

| Reported metric | Value in project documentation | How to interpret it |
|---|---:|---|
| Raw out-of-fold accuracy | 84.9% | Baseline model accuracy reported from the offline evaluation |
| Confidence-gated accuracy | 86.8% | Accuracy among events accepted above the configured confidence threshold |
| Coverage at confidence gate | About 95–96% | Share of events accepted rather than routed to review; verify the exact value against `src/data/model/metrics.json` for the final demo |
| Runtime inference | Reported below 1 ms/event | Software measurement in the TypeScript implementation, not a benchmark on every target edge device |

These figures are **reported project metrics, not independently reproduced in this README**. The confidence-gated figure must always be shown alongside its coverage; it is not the same as raw accuracy over every event. The repository’s evaluation artifact is the appropriate source of truth for the exact values used in a presentation.

### Forecasting

The forecasting module uses a lightweight regression/time-series approach and seasonal/calendar context to predict short-horizon demand. The interface exposes backtest errors and warns when predicted values exceed the configured baseline. This is a deliberate compute-conscious design for a potential edge deployment, rather than a claim that a heavy cloud model is required.

### Root-cause recommendations

The analytics code identifies unusually high or low values, then checks nearby manual logs and calendar events for contextual evidence. It returns a probable cause and a ranked action with estimated resource or cost impact. Because correlation does not prove causation, recommendations should be presented as **evidence-backed hypotheses for staff to verify**, not as guaranteed explanations.

## 6. Circular-resource and incentive logic

The dashboard brings waste diversion and resource use into the same view. It computes building-level metrics such as energy intensity, solar contribution, recycling/diversion, contamination, landfill output, and compost yield. A Green Score combines selected performance indicators; Green Credits and the leaderboard model a possible incentive mechanism.

These scores are prototype-defined formulas, not a validated behavioural intervention. In a real campus pilot, impact should be measured against a baseline and/or comparison group, using outcomes such as landfill mass per occupant, contamination rate, resource use per occupant or square metre, participation, and sustained changes over time. The prototype’s displayed impact metrics should not be described as independently verified savings.

## 7. Resilience, security, and scaling

### Network interruptions and integrity

The benchmark simulates delayed delivery, buffered batches, and duplicate retransmissions. The dashboard exposes those patterns and demonstrates how they may be identified and reconciled. The full production design would also need durable gateway queues, idempotent ingestion keys, timestamp policy, conflict resolution, retry limits, and recovery tests on actual hardware.

### Failure modes included in the prototype

| Risk | Prototype signal | Practical mitigation to explain to judges |
|---|---|---|
| Sensor drift or fouling | Change in sensor distributions over time | Scheduled calibration, cleaning, drift thresholds, and human review |
| Incentive gaming | Physically suspicious heavy/dense disposal events | Rate limits, audit samples, cross-sensor checks, and appeal/review workflow |
| Concept drift | Differences between semester, working, and exam regimes | Monitor error by regime, retrain/revalidate periodically, and preserve model versions |

### Proposed deployment architecture

The architecture page provides a proposed per-building bill of materials and a scaling simulator. The design concept is to use low-cost sensor nodes and local gateways for collection/buffering, aggregate by building or cluster, and send summarized/validated events upstream. The simulator helps communicate a possible path from a few buildings to 30 or more, but it is **not proof of production capacity**. A real rollout would require measured message volume, gateway stress tests, security review, maintenance estimates, and validated cost quotes.

### Supabase and access control

The repository contains database migrations for the schema and row-level security policies, plus client/server Supabase helpers. The documented roles are:

- **Admin:** campus-wide management
- **Warden:** designated hostel/mess log workflows
- **Technician:** maintenance, calibration, and permitted log writes
- **Student:** leaderboard, building scores, and bin-simulator views

For production, authorization must be enforced in server/database policies; a client-side role switch alone is not security. Keep service-role credentials on the server and never expose them to browser code.

## 8. Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Web application | Next.js 15 App Router, React 19, TypeScript | Routes, UI, server-side calculations, API endpoints |
| Interface and charts | Tailwind CSS, Recharts, lucide-react | Dashboard layout, visualizations, icons |
| Dataset preparation | Python, pandas, NumPy, openpyxl | Convert and prepare benchmark data |
| Model training | scikit-learn | Offline Random Forest training and evaluation |
| Model runtime | TypeScript | Run exported forest inference without Python at request time |
| Optional database | Supabase Postgres, Auth, RLS, Realtime | Connected persistence and access control |
| Copilot | Groq SDK | Server-side facilities Q&A, when configured |
| Deployment target | Vercel | Hosting and serverless API routes |
| Version control | GitHub | Source code and reproducible project history |

## 9. Run the project locally

### Requirements

Install a recent Node.js LTS release and npm. Python is only needed if you plan to regenerate the dataset/model. Supabase and Groq credentials are optional for local offline browsing.

### Start in offline mode

```bash
git clone https://github.com/DilawarSinghh/p2p.git
cd p2p
npm install
npm run dev
```

Open **http://localhost:3000**. The default configuration uses bundled datasets. For a guided overview, open **http://localhost:3000/project-guide** first. If needed, create `.env.local` from `.env.example` and keep:

```dotenv
NEXT_PUBLIC_USE_LOCAL_DATA=true
```

### Optional: connect Supabase

1. Create a Supabase project.
2. Run `supabase/migrations/0001_schema.sql` and then `supabase/migrations/0002_rls.sql` in the SQL editor.
3. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
4. Seed the database using `npm run seed` if that workflow is appropriate for your project.
5. Set `NEXT_PUBLIC_USE_LOCAL_DATA=false` and validate each page against the connected database.

Do not commit `.env.local` or real credentials. The example file should contain placeholders only.

### Optional: enable the Copilot

Set `GROQ_API_KEY` in `.env.local`. Without this key, the chat API cannot call the hosted model.

### Regenerate data and model

Use this only when the relevant raw source files and Python dependencies are available:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install pandas openpyxl scikit-learn numpy
npm run data:build
```

### Build for deployment

```bash
npm run build
npm run start
```

The repository targets Vercel deployment; configure the required environment variables in the Vercel project settings before enabling connected services.

## 10. Repository map

```text
src/app/                  Project Guide, dashboard pages, sandbox, and API routes
src/components/           Navigation, charts, chat, and reusable UI
src/lib/                  Data access, metrics, classifier, forecast,
                          fusion, anomaly analysis, incentives, resilience
src/data/datasets/        Bundled benchmark datasets as JSON
src/data/model/           Exported Random Forest and model metrics
data/csv/                 Source benchmark tables
data/raw/                 Problem statement and dataset guide
scripts/                  Data conversion, model training, Supabase seeding
supabase/migrations/      Database schema and RLS policies
public/exports/           Test-event prediction exports
```

## 11. What has been demonstrated—and what remains to validate

**Demonstrated in the codebase:** multi-page analytics UI; bundled data operation; TypeScript execution of the exported classifier; forecasting/anomaly/incentive calculations; visualizations for telemetry delay/duplicates; role-oriented demo views; optional Supabase integration; and a server-side Copilot route.

**Not established by the repository alone:** a live deployment of sensors across campus; measured savings at a real institution; validated behavioural effects of Green Credits; independent replication of reported model metrics; a production-grade offline gateway implementation on physical hardware; or load-tested operation at 30+ buildings. These are appropriate pilot and validation milestones—not claims to make without evidence.

## 12. Suggested 2-minute judge walkthrough

1. **Problem (15 seconds):** “Campus resource data is fragmented and often reviewed late. We want the team to see where resources are going, what may happen next, and what to investigate.”
2. **Command Center (20 seconds):** point out energy, water, CO₂ estimate, landfill, diversion, and per-building differences.
3. **Trust in data (15 seconds):** show delayed/duplicate/buffered records in Telemetry Fusion.
4. **AI classification (20 seconds):** demonstrate a sensor event, its predicted class, confidence, route, and review path.
5. **Prediction and action (25 seconds):** show the forecast and one Root Cause item, including evidence and a suggested action.
6. **Circular outcomes (10 seconds):** show the leaderboard and diversion/compost metrics.
7. **Feasibility and honesty (15 seconds):** show the scale/failure-mode page and clarify that the current benchmark is synthetic and hardware-scale claims are design estimates.

**One-line summary:** *We turn fragmented campus resource data into a unified, explainable decision-support workflow—from data quality and edge waste classification to short-horizon forecasting, root-cause investigation, and circular-resource incentives.*

---

For the challenge constraints and source-data assumptions, see `data/raw/PROBLEM_STATEMENT_AND_CONSTRAINTS.md` and `data/raw/README_data_guide.md`.