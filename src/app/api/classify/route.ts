import { NextRequest, NextResponse } from "next/server";
import { classify, type SensorReading } from "@/lib/classifier";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<SensorReading>;
  const reading: SensorReading = {
    weight_g: Number(body.weight_g ?? 0),
    moisture_pct: Number(body.moisture_pct ?? 0),
    metal_signal: Number(body.metal_signal ?? 0),
    transparency: Number(body.transparency ?? 0),
    acoustic_hardness: Number(body.acoustic_hardness ?? 0),
  };
  return NextResponse.json(classify(reading));
}
