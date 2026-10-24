import { NextRequest, NextResponse } from "next/server";
import { getWasteTest } from "@/lib/data";
import { classify } from "@/lib/classifier";

export const runtime = "nodejs";

// Streams a page of the 1,601 unlabelled test events, classified live.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "50", 10));
  const test = getWasteTest();
  const slice = test.slice(offset, offset + limit);
  const results = slice.map((e) => {
    const r = classify({
      weight_g: e.weight_g,
      moisture_pct: e.moisture_pct,
      metal_signal: e.metal_signal,
      transparency: e.transparency,
      acoustic_hardness: e.acoustic_hardness,
    });
    return {
      event_id: e.event_id,
      building_id: e.building_id,
      bin_id: e.bin_id,
      ...r,
    };
  });
  return NextResponse.json({ total: test.length, offset, limit, results });
}
