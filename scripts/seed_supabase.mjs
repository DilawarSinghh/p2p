// ============================================================================
// Seed a Supabase project with all 7 datasets (+ predictions) from the local
// JSON files. Idempotent: upserts on primary keys.
//
// Usage:
//   1. Run the SQL migrations in supabase/migrations/ on your project.
//   2. Fill SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local
//   3. node scripts/seed_supabase.mjs
// ============================================================================
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// load .env.local manually (no dependency)
const envPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const DATA = path.join(ROOT, "src", "data", "datasets");
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf-8"));

async function upsert(table, rows, conflict, chunk = 500) {
  console.log(`Seeding ${table} (${rows.length} rows)...`);
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflict });
    if (error) {
      console.error(`  error at ${i}:`, error.message);
      process.exit(1);
    }
    process.stdout.write(`  ${Math.min(i + chunk, rows.length)}/${rows.length}\r`);
  }
  console.log(`  ✓ ${table} done`);
}

async function main() {
  await upsert("buildings", read("buildings.json"), "building_id");
  await upsert("calendar", read("calendar.json"), "date");
  await upsert("daily_summary", read("daily_summary.json"), "date,building_id");

  // hourly_streams has a serial PK; drop id-less rows and let DB assign.
  const hourly = read("hourly_streams.json").map(({ ...r }) => r);
  await upsert("hourly_streams", hourly, undefined);

  await upsert("manual_logs", read("manual_logs.json"), "log_id");
  await upsert("waste_events_train", read("waste_events_train.json"), "event_id");

  // waste_events_test: attach predictions if present
  const test = read("waste_events_test.json");
  const predPath = path.join(ROOT, "public", "exports", "waste_events_test_predictions.csv");
  if (fs.existsSync(predPath)) {
    const lines = fs.readFileSync(predPath, "utf-8").trim().split("\n").slice(1);
    const pred = {};
    for (const l of lines) {
      const [id, cls, conf] = l.split(",");
      pred[id] = { predicted_class: cls, confidence: Number(conf) };
    }
    for (const r of test) {
      if (pred[r.event_id]) {
        r.predicted_class = pred[r.event_id].predicted_class;
        r.confidence = pred[r.event_id].confidence;
      }
    }
  }
  await upsert("waste_events_test", test, "event_id");

  console.log("\nAll datasets seeded successfully.");
}

main();
