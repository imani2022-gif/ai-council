import { NextRequest, NextResponse } from "next/server";
import { callGroq } from "@/lib/groq";
import { SYNTHESIZER_SYSTEM, synthesizerUserPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const { motion, advocateXml, criticXml } = await req.json();
    if (!motion || !advocateXml || !criticXml) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const text = await callGroq(
      SYNTHESIZER_SYSTEM,
      synthesizerUserPrompt(motion, advocateXml, criticXml),
      800
    );
    return NextResponse.json({ xml: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
