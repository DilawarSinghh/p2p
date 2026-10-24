import { NextRequest, NextResponse } from "next/server";
import {
  verifyWaste,
  verifyTelemetry,
  parseCsv,
  rowFromCsv,
  type VerifyRow,
  type VerifyResult,
} from "@/lib/verify";

export const runtime = "nodejs";

async function verifyOne(row: VerifyRow): Promise<VerifyResult> {
  return row.kind === "waste" ? verifyWaste(row) : verifyTelemetry(row);
}

export async function POST(req: NextRequest) {
  let rows: VerifyRow[] = [];

  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (Array.isArray(body.rows)) rows = body.rows as VerifyRow[];
      else if (body.row) rows = [body.row as VerifyRow];
      else if (body.csv) {
        rows = parseCsv(String(body.csv))
          .map(rowFromCsv)
          .filter((r): r is VerifyRow => r !== null);
      }
    } else if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (file && typeof file !== "string") {
        const text = await file.text();
        rows = parseCsv(text)
          .map(rowFromCsv)
          .filter((r): r is VerifyRow => r !== null);
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: "Could not parse request body", detail: String(e) },
      { status: 400 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "No valid rows found. Provide waste sensor rows (weight_g, moisture_pct, ...) or telemetry rows (building_id, timestamp, electricity_kwh).",
      },
      { status: 400 }
    );
  }

  // Cap batch size to keep the serverless function snappy.
  const capped = rows.slice(0, 500);
  const results = await Promise.all(capped.map(verifyOne));

  const summary = {
    total: results.length,
    success: results.filter((r) => r.status === "success").length,
    mismatch: results.filter((r) => r.status === "mismatch").length,
    missing: results.filter((r) => r.status === "missing").length,
  };
  const overall: "success" | "mismatch" =
    summary.mismatch + summary.missing === 0 ? "success" : "mismatch";

  return NextResponse.json({ status: overall, summary, results });
}
