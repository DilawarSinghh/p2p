import Link from "next/link";
import { Card } from "@/components/ui";

const routes = [
  {
    number: "01",
    title: "Campus Command Center",
    href: "/",
    constraint: "See the whole campus",
    description:
      "Review electricity, water, solar, estimated CO₂, landfill, diversion, data-health counters, and differences between buildings.",
    judgePrompt: "Which buildings or resource streams should operations staff investigate first?",
  },
  {
    number: "02",
    title: "Telemetry Fusion",
    href: "/telemetry-fusion",
    constraint: "Trust messy incoming data",
    description:
      "Inspect asynchronous telemetry sources and the benchmark's delayed, buffered, and duplicate records.",
    judgePrompt: "Can the system distinguish an operational signal from a data-delivery problem?",
  },
  {
    number: "03",
    title: "Edge Classifier",
    href: "/edge-classifier",
    constraint: "Make a local waste decision",
    description:
      "See five physical sensor inputs, one of six waste classes, prediction confidence, and the suggested disposal route.",
    judgePrompt: "What happens when the model is not sufficiently confident?",
  },
  {
    number: "04",
    title: "Forecasting",
    href: "/forecasting",
    constraint: "Look ahead, not only back",
    description:
      "Select a building, a resource metric, and a 6- or 12-hour horizon; review backtest errors and possible spikes.",
    judgePrompt: "How could a facilities team prepare before a predicted demand surge?",
  },
  {
    number: "05",
    title: "Root Cause",
    href: "/root-cause",
    constraint: "Turn an anomaly into an action",
    description:
      "Review ranked anomalies, the likely cause, related evidence, and a recommended follow-up action.",
    judgePrompt: "What evidence supports the recommendation, and what should a person verify?",
  },
  {
    number: "06",
    title: "Circular + Credits",
    href: "/circular-incentives",
    constraint: "Measure circular outcomes",
    description:
      "Compare Green Scores, Green Credits, diversion, compost yield, solar contribution, and changes over time.",
    judgePrompt: "Which outcomes should be tracked to test whether incentives change behaviour?",
  },
  {
    number: "07",
    title: "Scale + Resilience",
    href: "/architecture-scale",
    constraint: "Explain feasibility and risk",
    description:
      "Review the proposed building-level bill of materials, scaling assumptions, ROI estimates, and failure-mode monitors.",
    judgePrompt: "Which assumptions need a real pilot before deployment?",
  },
  {
    number: "08",
    title: "Data Testing Sandbox",
    href: "/data-validation",
    constraint: "Inspect data quality",
    description:
      "Use the validation sandbox to examine checks and edge cases in the data-handling workflow.",
    judgePrompt: "How do we catch bad or inconsistent data before it misleads the dashboard?",
  },
];

const constraints = [
  ["Multi-source sensor fusion", "Telemetry Fusion", "Combine IoT telemetry, event-based smart-bin data, and manual logs."],
  ["Waste classification at the edge", "Edge Classifier", "Classify six categories from five sensor features; confidence-gate uncertain outputs."],
  ["6–12 hour forecasting", "Forecasting", "Expose short-horizon estimates, hold-out backtest metrics, and spike warnings."],
  ["Intermittent connections and data integrity", "Telemetry Fusion", "Visualize ingestion delays, buffered batches, and duplicate retransmissions in the benchmark."],
  ["Explainable root-cause analysis", "Root Cause", "Connect anomalies with contextual evidence and ranked recommendations."],
  ["Behavioural and economic incentives", "Circular + Credits", "Model Green Scores, credits, leaderboards, and resource-diversion outcomes."],
  ["Budget and scaling", "Scale + Resilience", "Communicate the proposed bill of materials, assumptions, and scale scenario."],
  ["Failure-mode awareness", "Scale + Resilience", "Show signals for sensor drift, incentive gaming, and concept drift."],
];

export default function ProjectGuidePage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <section className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-panel to-panel p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="pill bg-accent/15 text-accent">P2P 2026</span>
          <span className="pill bg-warn/10 text-warn border border-warn/20">Prototype · synthetic benchmark data</span>
        </div>
        <p className="label mb-2">START HERE · PROJECT OVERVIEW</p>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight text-slate-50">
          Predictive Circular-Resource Grid
        </h1>
        <p className="text-base md:text-lg text-slate-300 mt-3 max-w-3xl leading-relaxed">
          One operations cockpit to help a campus understand where electricity, water, and waste are going,
          anticipate near-term demand, investigate unusual readings, and prioritize practical actions.
        </p>
        <p className="text-sm text-muted mt-4 max-w-3xl leading-relaxed">
          The current demo uses a synthetic 8-building, 120-day benchmark. It demonstrates the product workflow;
          it does not claim that physical sensors are already deployed across a live campus.
        </p>
        <div className="flex flex-wrap gap-2 mt-6">
          <Link href="/" className="btn btn-accent">Open Command Center →</Link>
          <Link href="/edge-classifier" className="btn">See the AI classifier</Link>
          <Link href="/root-cause" className="btn">See recommendations</Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card title="The problem">
          <p className="text-sm text-slate-300 leading-relaxed">
            Manual, disconnected records make it difficult to detect waste and resource spikes early, compare buildings,
            reconcile delayed readings, and explain what may have caused a change.
          </p>
        </Card>
        <Card title="Our solution">
          <p className="text-sm text-slate-300 leading-relaxed">
            Bring telemetry, smart-bin measurements, calendar context, and field logs into one interface with analytics,
            a lightweight classifier, short-term forecasts, and evidence-led investigation aids.
          </p>
        </Card>
        <Card title="The intended outcome">
          <p className="text-sm text-slate-300 leading-relaxed">
            Give campus administrators and facilities staff a clearer basis for deciding what to check, where to focus,
            and how to measure resource diversion and operational improvement.
          </p>
        </Card>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-slate-100">How to explore the prototype</h2>
          <p className="text-sm text-muted mt-1">
            Follow the journey from observation to recommended action. Each card opens the relevant live page in this app.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="group rounded-xl border border-border bg-panel p-4 hover:border-accent/50 hover:bg-panel2 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-lg border border-border bg-panel2 w-10 h-10 flex items-center justify-center text-accent font-semibold">
                  {route.number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-100 group-hover:text-accent">{route.title}</h3>
                    <span className="text-xs text-muted">{route.href} ↗</span>
                  </div>
                  <p className="text-xs text-accent mt-1">{route.constraint}</p>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed">{route.description}</p>
                  <p className="text-xs text-muted mt-3 border-t border-border pt-3">
                    <span className="text-slate-400 font-semibold">Ask while demoing:</span> {route.judgePrompt}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-panel p-5">
        <h2 className="text-lg font-semibold text-slate-100 mb-1">Requirement → feature map</h2>
        <p className="text-sm text-muted mb-4">This is the quickest way to connect the challenge requirements to the visible implementation.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted text-xs border-b border-border">
                <th className="py-2 pr-4">Challenge requirement</th>
                <th className="py-2 pr-4">Where to look</th>
                <th className="py-2">What the prototype demonstrates</th>
              </tr>
            </thead>
            <tbody>
              {constraints.map(([requirement, route, explanation]) => (
                <tr key={requirement} className="border-b border-border/50 align-top">
                  <td className="py-3 pr-4 text-slate-200">{requirement}</td>
                  <td className="py-3 pr-4 text-accent whitespace-nowrap">{route}</td>
                  <td className="py-3 text-slate-300">{explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="What is technically distinctive?">
          <ul className="space-y-2 text-sm text-slate-300 leading-relaxed list-disc pl-5">
            <li>The trained Random Forest is exported to JSON and executed by TypeScript at runtime, avoiding a Python service for each classification request.</li>
            <li>Low-confidence classifications can be routed for review instead of treating every prediction as certain.</li>
            <li>Forecasting, anomaly context, normalization, incentives, and resilience views are organized into a single operational workflow.</li>
            <li>The demo can run from bundled local data; Supabase and the Groq-powered copilot are optional integrations.</li>
          </ul>
        </Card>
        <Card title="Metrics and evidence—explain them precisely">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="stat">
              <p className="label">Reported raw accuracy</p>
              <p className="text-2xl font-semibold text-slate-50 mt-1">84.9%</p>
              <p className="text-xs text-muted mt-1">5-fold stratified out-of-fold evaluation</p>
            </div>
            <div className="stat">
              <p className="label">Reported gated accuracy</p>
              <p className="text-2xl font-semibold text-good mt-1">86.8%</p>
              <p className="text-xs text-muted mt-1">At confidence ≥ 0.5; about 94.8% coverage</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The numbers above are from the repository's exported model metrics. Gated accuracy applies only to accepted
            events; always show its coverage as well. Software latency claims are not a substitute for testing on target hardware.
          </p>
        </Card>
      </section>

      <section className="rounded-xl border border-warn/25 bg-warn/5 p-5">
        <h2 className="text-lg font-semibold text-slate-100">What is demonstrated vs. what still needs validation?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
          <div>
            <h3 className="text-sm font-semibold text-good mb-2">Visible in this codebase</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-300">
              <li>Dashboard pages using bundled benchmark data</li>
              <li>TypeScript inference for the exported waste classifier</li>
              <li>Forecast, anomaly, incentive, and data-health calculations</li>
              <li>Optional Supabase integration and server-side Copilot route</li>
              <li>UI demonstrations of data delay, duplicates, and failure-mode signals</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-warn mb-2">Not yet proven by this demo alone</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-300">
              <li>Live physical sensor deployment across a real campus</li>
              <li>Verified energy, water, cost, or landfill savings in operation</li>
              <li>Behavioural impact of Green Credits in a controlled pilot</li>
              <li>Production recovery guarantees from real disconnected gateways</li>
              <li>Load-tested capacity and actual costs for 30+ buildings</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-slate-300 mt-4 leading-relaxed">
          Clear separation between implemented software, simulated scenarios, and future validation makes the project more credible
          and helps a judge assess it on evidence rather than promises.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-panel p-5">
        <h2 className="text-lg font-semibold text-slate-100">Recommended judge walkthrough · approximately 2 minutes</h2>
        <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-slate-300 leading-relaxed">
          <li><span className="text-slate-100 font-semibold">15 seconds — Problem and scope:</span> explain fragmented campus resource data and the synthetic 8-building benchmark.</li>
          <li><span className="text-slate-100 font-semibold">20 seconds — Command Center:</span> show resource KPIs and how buildings differ.</li>
          <li><span className="text-slate-100 font-semibold">15 seconds — Telemetry Fusion:</span> explain how late, buffered, and duplicate records are made visible.</li>
          <li><span className="text-slate-100 font-semibold">20 seconds — Edge Classifier:</span> show sensor inputs, class, confidence, routing, and the review path.</li>
          <li><span className="text-slate-100 font-semibold">25 seconds — Forecast and Root Cause:</span> show one predicted spike and one evidence-backed recommended action.</li>
          <li><span className="text-slate-100 font-semibold">10 seconds — Circular outcomes:</span> point out diversion and building incentive metrics.</li>
          <li><span className="text-slate-100 font-semibold">15 seconds — Feasibility:</span> close with the scaling proposal, failure monitors, and what a real pilot must validate.</li>
        </ol>
      </section>
    </div>
  );
}
