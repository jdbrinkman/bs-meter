import { VERDICTS, BS_SCORE_LABELS } from "@/lib/scoring/brackets";
import { GENRE_RULES } from "@/config/genre-weights";
import { NEGATIVE_SIGNALS, POSITIVE_SIGNALS } from "@/config/signal-taxonomy";
import { TRUSTED_REVIEWERS } from "@/config/trusted-reviewers";
import type { VerdictKey } from "@/lib/types";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-white">Methodology</h1>
      <p className="mb-10 text-zinc-400">
        How BS Meter scores games across 9 dimensions of quality and time-respect.
      </p>

      {/* The Scoring System */}
      <Section title="The Scoring System">
        <p className="mb-4 text-sm text-zinc-300">
          Every game gets two scores. Gemini 2.5 Flash scores 9 dimensions (each 1-10),
          then we compute both scores from those using genre-adjusted weights.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h4 className="mb-1 font-bold text-white">Enjoyment Score (0-100)</h4>
            <p className="text-xs text-zinc-400">
              Weighted sum across all 9 dimensions, normalized and curved so a
              &ldquo;genuinely good game&rdquo; lands around 78. Determines the verdict (Must Play → Skip).
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h4 className="mb-1 font-bold text-white">BS Score (0-10)</h4>
            <p className="text-xs text-zinc-400">
              Measures friction only — pacing, combat repetition, UI, and polish.
              Lower is better. A 1.5 means the game respects your time; an 8+ means
              chronic padding.
            </p>
          </div>
        </div>
      </Section>

      {/* 9 Dimensions */}
      <Section title="The 9 Dimensions">
        <div className="space-y-3">
          {[
            { name: "Story Quality", desc: "Writing, narrative structure, and emotional resonance" },
            { name: "Narrative Investment", desc: "How much you care about characters — atmospheric storytelling (Bloodborne, Returnal) counts fully" },
            { name: "Pacing", desc: "Every hour earning its keep — filler and hollow padding are penalized, deliberate slowness is not" },
            { name: "Combat Variety", desc: "Does combat stay fresh, or does it become repetitive and grinding?" },
            { name: "Boss Design", desc: "Quality, fairness, and memorability of boss encounters" },
            { name: "Exploration", desc: "How rewarding is world discovery — does the world feel worth exploring?" },
            { name: "Polish & Stability", desc: "Bug-free, technically stable, no crashes or major jank" },
            { name: "UI & Controls", desc: "Intuitive, responsive — the game gets out of its own way" },
            { name: "Atmospheric Depth", desc: "Immersion, world-building, tonal cohesion — even without explicit dialogue" },
          ].map((d) => (
            <div key={d.name}>
              <span className="text-sm font-semibold text-white">{d.name}</span>
              <p className="text-xs text-zinc-400">{d.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Verdicts */}
      <Section title="Verdict Scale">
        <div className="mb-6 space-y-3">
          {(Object.keys(VERDICTS) as VerdictKey[]).map((key) => {
            const v = VERDICTS[key];
            return (
              <div key={key} className="flex items-center gap-3">
                <span
                  className="inline-block w-28 rounded-full py-1 text-center text-xs font-bold text-white"
                  style={{ backgroundColor: v.color }}
                >
                  {v.range}
                </span>
                <span className="font-semibold text-white">{v.label}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500">
          Note: Pure Gameplay and PvPvE Extraction games are capped at 87 (Buy tier) — a game with no authored story cannot reach Must Play regardless of mechanical quality.
        </p>
        <h4 className="mb-3 mt-6 text-sm font-semibold text-zinc-300">BS Score Legend</h4>
        <div className="space-y-2">
          {BS_SCORE_LABELS.map((tier) => (
            <div key={tier.label} className="flex items-center gap-3 text-xs">
              <span className="w-12 font-bold" style={{ color: tier.color }}>
                0–{tier.max}
              </span>
              <span className="text-zinc-400">{tier.label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Genre Rules */}
      <Section title="Genre-Sensitive Weights">
        <p className="mb-4 text-sm text-zinc-300">
          Weights vary by genre — a Soulslike is judged primarily on boss design and combat,
          while a Narrative RPG lives or dies on its story.
        </p>
        <div className="space-y-4">
          {Object.values(GENRE_RULES).map((rule) => (
            <div key={rule.key} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{rule.displayName}</span>
                {rule.narrativeCap && (
                  <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                    Narrative cap
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-500">{rule.aiGuidance.slice(0, 120)}...</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Signal Taxonomy */}
      <Section title="BS Signal Taxonomy">
        <p className="mb-4 text-sm text-zinc-300">
          The AI looks for these specific signals in reviewer transcripts and game data.
        </p>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase text-red-400">
              Negative Signals ({NEGATIVE_SIGNALS.length})
            </h4>
            <div className="space-y-2">
              {NEGATIVE_SIGNALS.map((s) => (
                <div key={s.key} className="text-xs">
                  <span className="font-medium text-red-300">{s.label}</span>
                  <span className="text-zinc-500"> — {s.description}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase text-green-400">
              Positive Signals ({POSITIVE_SIGNALS.length})
            </h4>
            <div className="space-y-2">
              {POSITIVE_SIGNALS.map((s) => (
                <div key={s.key} className="text-xs">
                  <span className="font-medium text-green-300">{s.label}</span>
                  <span className="text-zinc-500"> — {s.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Trusted Reviewers */}
      <Section title="Trusted Reviewers">
        <p className="mb-4 text-sm text-zinc-300">
          BS Meter analyzes transcripts from these reviewers, chosen for their
          expertise in detecting specific types of BS.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {TRUSTED_REVIEWERS.map((r) => (
            <div
              key={r.slug}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <h4 className="font-semibold text-white">{r.channelName}</h4>
              <p className="text-xs font-medium text-zinc-400">
                {r.specialty}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{r.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Data Sources */}
      <Section title="Data Sources">
        <ul className="space-y-2 text-sm text-zinc-300">
          <li>
            <strong className="text-white">IGDB</strong> — Game metadata,
            release dates, genres, cover art
          </li>
          <li>
            <strong className="text-white">HowLongToBeat</strong> — Main story,
            main+extras, and completionist time data
          </li>
          <li>
            <strong className="text-white">OpenCritic</strong> — Critic review
            scores and tiers
          </li>
          <li>
            <strong className="text-white">YouTube</strong> — Reviewer
            transcripts from trusted channels
          </li>
          <li>
            <strong className="text-white">Reddit via Perplexity</strong> — User
            sentiment, bug reports, and community complaints
          </li>
          <li>
            <strong className="text-white">Gemini 2.5 Flash</strong> — AI
            analysis across all 9 dimensions
          </li>
        </ul>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}
