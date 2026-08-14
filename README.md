# The Council

A four-seat AI deliberation pipeline. Put a motion (a question, a policy, a
decision) in front of the council and four chained model calls debate it:

1. **Advocate** — builds the strongest case in favor
2. **Critic** — builds the strongest case against (runs in parallel with the Advocate)
3. **Synthesizer** — reads both cases, maps agreements, disagreements, uncertainties, and implications
4. **Chair** — reads everything above and renders a recommendation, a confidence level, and the conditions that would reverse it

Built with Next.js (App Router) and the free [Groq API](https://console.groq.com).

## Run it locally

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and paste in your free Groq API key
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Push this project to a GitHub repo.
2. Go to https://vercel.com/new and import that repo.
3. Before the first deploy, add an Environment Variable:
   - Key: `GROQ_API_KEY`
   - Value: your Groq API key
4. Deploy. Vercel builds and hosts it for free.

## How it's built

Each seat is a separate serverless API route (`/api/advocate`, `/api/critic`,
`/api/synthesize`, `/api/decide`) with its own system prompt and a required
XML output shape, so responses can be parsed reliably. The client calls the
Advocate and Critic in parallel, then chains their output into the
Synthesizer's prompt, then chains all three into the Chair's prompt — a real
sequential pipeline, not four independent calls glued together after the fact.
