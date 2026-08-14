"use client";

import { useState, useCallback } from "react";
import { extractTag, extractList } from "@/lib/parseXml";

type SeatStatus = "idle" | "loading" | "done" | "error";

interface ArgumentSeat {
  status: SeatStatus;
  argument: string;
  points: string[];
  raw: string;
  error?: string;
}

interface Synthesis {
  status: SeatStatus;
  agreements: string[];
  disagreements: string[];
  uncertainties: string[];
  implications: string[];
  raw: string;
  error?: string;
}

interface Decision {
  status: SeatStatus;
  recommendation: string;
  confidence: string;
  reasoning: string;
  reversalConditions: string[];
  error?: string;
}

const EMPTY_SEAT: ArgumentSeat = { status: "idle", argument: "", points: [], raw: "" };
const EMPTY_SYNTH: Synthesis = {
  status: "idle",
  agreements: [],
  disagreements: [],
  uncertainties: [],
  implications: [],
  raw: "",
};
const EMPTY_DECISION: Decision = {
  status: "idle",
  recommendation: "",
  confidence: "",
  reasoning: "",
  reversalConditions: [],
};

const EXAMPLES = [
  "Our university should ban laptops in lecture halls.",
  "Remote-first companies should stop requiring any in-office days.",
  "Cities should replace street parking minimums with transit investment.",
];

export default function Home() {
  const [motion, setMotion] = useState("");
  const [running, setRunning] = useState(false);
  const [advocate, setAdvocate] = useState<ArgumentSeat>(EMPTY_SEAT);
  const [critic, setCritic] = useState<ArgumentSeat>(EMPTY_SEAT);
  const [synthesis, setSynthesis] = useState<Synthesis>(EMPTY_SYNTH);
  const [decision, setDecision] = useState<Decision>(EMPTY_DECISION);

  const reset = useCallback(() => {
    setAdvocate(EMPTY_SEAT);
    setCritic(EMPTY_SEAT);
    setSynthesis(EMPTY_SYNTH);
    setDecision(EMPTY_DECISION);
  }, []);

  const runCouncil = useCallback(async () => {
    if (!motion.trim() || running) return;
    reset();
    setRunning(true);

    setAdvocate((s) => ({ ...s, status: "loading" }));
    setCritic((s) => ({ ...s, status: "loading" }));

    const [advocateRes, criticRes] = await Promise.all([
      fetch("/api/advocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motion }),
      }).then((r) => r.json()),
      fetch("/api/critic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motion }),
      }).then((r) => r.json()),
    ]);

    let advocateXml = "";
    if (advocateRes.error) {
      setAdvocate({ ...EMPTY_SEAT, status: "error", error: advocateRes.error });
    } else {
      advocateXml = advocateRes.xml;
      setAdvocate({
        status: "done",
        argument: extractTag(advocateXml, "argument"),
        points: extractList(advocateXml, "supporting_points", "point"),
        raw: advocateXml,
      });
    }

    let criticXml = "";
    if (criticRes.error) {
      setCritic({ ...EMPTY_SEAT, status: "error", error: criticRes.error });
    } else {
      criticXml = criticRes.xml;
      setCritic({
        status: "done",
        argument: extractTag(criticXml, "argument"),
        points: extractList(criticXml, "supporting_points", "point"),
        raw: criticXml,
      });
    }

    if (!advocateXml || !criticXml) {
      setRunning(false);
      return;
    }

    setSynthesis((s) => ({ ...s, status: "loading" }));
    const synthRes = await fetch("/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motion, advocateXml, criticXml }),
    }).then((r) => r.json());

    let synthesisXml = "";
    if (synthRes.error) {
      setSynthesis({ ...EMPTY_SYNTH, status: "error", error: synthRes.error });
      setRunning(false);
      return;
    } else {
      synthesisXml = synthRes.xml;
      setSynthesis({
        status: "done",
        agreements: extractList(synthesisXml, "agreements", "item"),
        disagreements: extractList(synthesisXml, "disagreements", "item"),
        uncertainties: extractList(synthesisXml, "uncertainties", "item"),
        implications: extractList(synthesisXml, "implications", "item"),
        raw: synthesisXml,
      });
    }

    setDecision((s) => ({ ...s, status: "loading" }));
    const decideRes = await fetch("/api/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motion, advocateXml, criticXml, synthesisXml }),
    }).then((r) => r.json());

    if (decideRes.error) {
      setDecision({ ...EMPTY_DECISION, status: "error", error: decideRes.error });
    } else {
      const dXml = decideRes.xml;
      setDecision({
        status: "done",
        recommendation: extractTag(dXml, "recommendation"),
        confidence: extractTag(dXml, "confidence"),
        reasoning: extractTag(dXml, "reasoning"),
        reversalConditions: extractList(dXml, "reversal_conditions", "condition"),
      });
    }

    setRunning(false);
  }, [motion, running, reset]);

  const started = advocate.status !== "idle";

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
        {/* Header */}
        <header className="mb-16">
          <p className="font-mono text-xs tracking-[0.25em] text-[var(--text-faint)] mb-4">
            THE COUNCIL
          </p>
          <h1 className="font-display text-4xl sm:text-5xl leading-[1.1] mb-4">
            Put it before the council
            <br />
            <span style={{ color: "var(--text-muted)" }}>before you decide.</span>
          </h1>
          <p className="text-[var(--text-muted)] max-w-xl leading-relaxed">
            Four seats, one motion. An Advocate and a Critic argue in earnest,
            a Synthesizer maps where they agree and where they don&apos;t, and
            a Chair renders a verdict — with the conditions under which it
            would change.
          </p>
        </header>

        {/* Stage 01 — Motion */}
        <section className="mb-14">
          <StageLabel n="01" label="THE MOTION" />
          <textarea
            value={motion}
            onChange={(e) => setMotion(e.target.value)}
            placeholder="State the motion before the council — a question, a policy, a decision you're weighing…"
            rows={4}
            disabled={running}
            className="w-full resize-none rounded-lg border px-5 py-4 text-lg leading-relaxed font-display placeholder:text-[var(--text-faint)] placeholder:font-body bg-[var(--bg-panel)] focus:outline-none disabled:opacity-60"
            style={{ borderColor: "var(--hairline)" }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={running}
                onClick={() => setMotion(ex)}
                className="font-mono text-xs px-3 py-1.5 rounded-full border transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
                style={{ borderColor: "var(--hairline)", color: "var(--text-faint)" }}
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={runCouncil}
            disabled={!motion.trim() || running}
            className="mt-6 font-mono text-sm tracking-wide px-6 py-3 rounded-md transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--verdict)", color: "#1a1610" }}
          >
            {running ? "The council is in session…" : "Convene the council"}
          </button>
        </section>

        {started && (
          <>
            {/* Stage 02 — Advocate & Critic */}
            <section className="mb-14 stage-enter">
              <StageLabel n="02" label="OPENING ARGUMENTS" />
              <div className="grid md:grid-cols-2 gap-px rounded-lg overflow-hidden" style={{ background: "var(--hairline)" }}>
                <SeatCard
                  role="Advocate"
                  stance="In favor"
                  color="var(--advocate)"
                  dim="var(--advocate-dim)"
                  seat={advocate}
                />
                <SeatCard
                  role="Critic"
                  stance="Against"
                  color="var(--critic)"
                  dim="var(--critic-dim)"
                  seat={critic}
                />
              </div>
            </section>

            {/* Stage 03 — Synthesis */}
            {(synthesis.status !== "idle") && (
              <section className="mb-14 stage-enter">
                <StageLabel n="03" label="SYNTHESIS" />
                <div
                  className="rounded-lg border p-6 sm:p-8"
                  style={{ borderColor: "var(--hairline)", background: "var(--bg-panel)" }}
                >
                  {synthesis.status === "loading" && <ThinkingLine label="Mapping the deliberation" color="var(--synthesis)" />}
                  {synthesis.status === "error" && <ErrorLine message={synthesis.error} />}
                  {synthesis.status === "done" && (
                    <div className="grid sm:grid-cols-2 gap-8">
                      <SynthesisColumn title="Where they agree" items={synthesis.agreements} color="var(--synthesis)" />
                      <SynthesisColumn title="Where they clash" items={synthesis.disagreements} color="var(--synthesis)" />
                      <SynthesisColumn title="Genuine uncertainties" items={synthesis.uncertainties} color="var(--synthesis)" />
                      <SynthesisColumn title="What's at stake" items={synthesis.implications} color="var(--synthesis)" />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Stage 04 — Verdict */}
            {decision.status !== "idle" && (
              <section className="mb-14 stage-enter">
                <StageLabel n="04" label="THE CHAIR'S VERDICT" />
                <div
                  className="rounded-lg border p-6 sm:p-10"
                  style={{ borderColor: "var(--verdict)", background: "var(--verdict-dim)" }}
                >
                  {decision.status === "loading" && <ThinkingLine label="The Chair is deliberating" color="var(--verdict)" />}
                  {decision.status === "error" && <ErrorLine message={decision.error} />}
                  {decision.status === "done" && (
                    <>
                      <div className="flex items-center gap-3 mb-5">
                        <span
                          className="font-mono text-[11px] tracking-wider px-2.5 py-1 rounded-full uppercase"
                          style={{ background: "var(--verdict)", color: "#1a1610" }}
                        >
                          {decision.confidence || "—"} confidence
                        </span>
                      </div>
                      <p className="font-display text-2xl sm:text-3xl leading-snug mb-6">
                        &ldquo;{decision.recommendation}&rdquo;
                      </p>
                      <p className="text-[var(--text-muted)] leading-relaxed mb-8">
                        {decision.reasoning}
                      </p>
                      {decision.reversalConditions.length > 0 && (
                        <div>
                          <p className="font-mono text-xs tracking-widest mb-3" style={{ color: "var(--verdict)" }}>
                            WOULD CHANGE IF
                          </p>
                          <ul className="space-y-2">
                            {decision.reversalConditions.map((c, i) => (
                              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                                <span className="font-mono" style={{ color: "var(--verdict)" }}>
                                  →
                                </span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            {!running && decision.status === "done" && (
              <button
                type="button"
                onClick={() => {
                  setMotion("");
                  reset();
                }}
                className="font-mono text-xs tracking-wide underline decoration-[var(--hairline)] underline-offset-4"
                style={{ color: "var(--text-faint)" }}
              >
                Bring a new motion
              </button>
            )}
          </>
        )}

        <footer className="mt-24 pt-8 border-t font-mono text-xs" style={{ borderColor: "var(--hairline)", color: "var(--text-faint)" }}>
          Four independent model calls, chained: Advocate + Critic run in
          parallel, then Synthesis reads both, then the Chair reads all three.
        </footer>
      </div>
    </main>
  );
}

function StageLabel({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>
        {n}
      </span>
      <span className="h-px flex-1 max-w-[24px]" style={{ background: "var(--hairline)" }} />
      <span className="font-mono text-xs tracking-[0.2em]" style={{ color: "var(--text-faint)" }}>
        {label}
      </span>
    </div>
  );
}

function ThinkingLine({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 font-mono text-sm" style={{ color }}>
      <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: color }} />
      {label}…
    </div>
  );
}

function ErrorLine({ message }: { message?: string }) {
  return (
    <p className="font-mono text-sm" style={{ color: "var(--critic)" }}>
      {message || "Something went wrong."}
    </p>
  );
}

function SeatCard({
  role,
  stance,
  color,
  dim,
  seat,
}: {
  role: string;
  stance: string;
  color: string;
  dim: string;
  seat: ArgumentSeat;
}) {
  return (
    <div className="p-6 sm:p-7" style={{ background: "var(--bg-panel)" }}>
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-xl" style={{ color }}>
          {role}
        </h3>
        <span
          className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-full uppercase"
          style={{ background: dim, color }}
        >
          {stance}
        </span>
      </div>
      {seat.status === "loading" && <ThinkingLine label="Preparing the case" color={color} />}
      {seat.status === "error" && <ErrorLine message={seat.error} />}
      {seat.status === "done" && (
        <>
          <p className="leading-relaxed mb-5">{seat.argument}</p>
          <ul className="space-y-2">
            {seat.points.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                <span style={{ color }}>·</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SynthesisColumn({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div>
      <p className="font-mono text-xs tracking-widest mb-3" style={{ color }}>
        {title.toUpperCase()}
      </p>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed flex gap-2.5">
            <span style={{ color }}>·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
