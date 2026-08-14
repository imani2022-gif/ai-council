import { NextRequest, NextResponse } from "next/server";
import { callGroq } from "@/lib/groq";
import { DECIDER_SYSTEM, deciderUserPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const { motion, advocateXml, criticXml, synthesisXml } = await req.json();
    if (!motion || !advocateXml || !criticXml || !synthesisXml) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const text = await callGroq(
      DECIDER_SYSTEM,
      deciderUserPrompt(motion, advocateXml, criticXml, synthesisXml),
      500
    );
    return NextResponse.json({ xml: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
