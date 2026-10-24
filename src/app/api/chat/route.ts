import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

// Model available on this Groq account. Swap to "openai/gpt-oss-20b" for
// lower latency, or a Llama model if your account later gains access.
const MODEL = "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `You are the "Campus Facilities Copilot" for a multi-building campus resource dashboard.
You help facilities staff, wardens, technicians, and students understand:
- Building-level electricity (kWh) and solar generation
- Water usage (litres)
- Waste streams: segregation, composting, recycling, contamination, and landfill diversion

Guidelines:
- Be concise and practical. Prefer short paragraphs and bullet points.
- When asked about numbers you don't have, explain what data source (daily_summary, hourly_streams, manual_logs, waste events) would answer it instead of inventing figures.
- Offer actionable, explainable recommendations (name the probable cause and the action).
- Stay on the topic of campus energy, water, and waste management.`;

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let messages: ChatMessage[] = [];
  try {
    const body = (await req.json()) as { messages?: ChatMessage[] };
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Keep only user/assistant turns from the client; we prepend our own system prompt.
  const history = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-20); // cap history to protect the context window

  if (history.length === 0) {
    return NextResponse.json({ error: "No messages provided." }, { status: 400 });
  }

  const groq = new Groq({ apiKey });

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 800,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ??
      "Sorry, I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Groq request failed: ${message}` },
      { status: 502 }
    );
  }
}
