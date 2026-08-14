import { NextRequest, NextResponse } from "next/server";
import { callGroq } from "@/lib/groq";
import { CRITIC_SYSTEM, motionUserPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const { motion } = await req.json();
    if (!motion || typeof motion !== "string") {
      return NextResponse.json({ error: "Missing motion" }, { status: 400 });
    }
    const text = await callGroq(CRITIC_SYSTEM, motionUserPrompt(motion), 600);
    return NextResponse.json({ xml: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
