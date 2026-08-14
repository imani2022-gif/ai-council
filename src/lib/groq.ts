// Groq offers a free API tier (no credit card required) with fast inference
// over open models. We call it via a plain fetch against its OpenAI-compatible
// endpoint, so no extra SDK dependency is needed.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const MODEL = "llama-3.3-70b-versatile";

export async function callGroq(system: string, user: string, maxTokens: number) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it in your environment (.env.local locally, or Vercel Project Settings > Environment Variables)."
    );
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
