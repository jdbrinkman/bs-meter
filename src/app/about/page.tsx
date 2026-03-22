import { BRACKETS } from "@/lib/scoring/brackets";
import { GENRE_RULES } from "@/config/genre-weights";
import { NEGATIVE_SIGNALS, POSITIVE_SIGNALS } from "@/config/signal-taxonomy";
import { TRUSTED_REVIEWERS } from "@/config/trusted-reviewers";
import type { BracketKey } from "@/lib/types";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-white">Methodology</h1>
      <p className="mb-10 text-zinc-400">
        How BS Meter scores games on how much they respect your time.
      </p>

      {/* The Formula */}
      <Section title="The Formula">
        <p className="mb-4 text-sm text-zinc-300">
          Every game is scored on a 1-10 scale using four weighted pillars.
          Higher scores mean less BS.
        </p>
        <code className="block rounded-lg bg-zinc-900 p-4 text-sm text-zinc-300">
          BS_Score = (w.P x Pacing) + (w.B x Bloat) + (w.V x Value) + (w.G x
          Grind)
        </code>
        <div className="mt-4 space-y-3">
          <Pillar
            name="Pacing & Flow (P)"
            desc="Does the game maintain engagement throughout? Are there dead zones or walk-and-talk padding?"
          />
          <Pillar
            name="Bloat Ratio (B)"
            desc="How much content beyond the main path is filler? Calculated partly from HowLongToBeat data."
          />
          <Pillar
            name="Value / Cost (V)"
            desc="Is the price justified by quality hours — not just total hours? A $70 game that's 60% filler scores low."
          />
          <Pillar
            name="Grind Factor (G)"
            desc="Does progression feel earned or forced? Are there artificial walls, RNG gates, or mandatory level gating?"
          />
        </div>
      </Section>

      {/* Brackets */}
      <Section title="The Brackets">
        <div className="space-y-3">
          {(Object.keys(BRACKETS) as BracketKey[]).map((key) => {
            const b = BRACKETS[key];
            return (
              <div key={key} className="flex items-center gap-3">
                <span
                  className="inline-block w-20 rounded-full py-1 text-center text-xs font-bold text-white"
                  style={{ backgroundColor: b.color }}
                >
                  {b.range}
                </span>
                <span className="font-semibold text-white">{b.label}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Genre Rules */}
      <Section title="Genre-Sensitive Scoring">
        <p className="mb-4 text-sm text-zinc-300">
          A single BS framework across all genres would create bad results.
          Roguelikes repeat by design. JRPGs are longer by design. So we adjust
          pillar weights per genre.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-2 pr-4">Genre</th>
                <th className="py-2 pr-2">P</th>
                <th className="py-2 pr-2">B</th>
                <th className="py-2 pr-2">V</th>
                <th className="py-2 pr-2">G</th>
                <th className="py-2">Key Rule</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(GENRE_RULES).map((rule) => (
                <tr key={rule.key} className="border-b border-zinc-900">
                  <td className="py-2 pr-4 font-medium text-white">
                    {rule.displayName}
                  </td>
                  <td className="py-2 pr-2 text-zinc-400">
                    {rule.weights.pacing}
                  </td>
                  <td className="py-2 pr-2 text-zinc-400">
                    {rule.weights.bloat}
                  </td>
                  <td className="py-2 pr-2 text-zinc-400">
                    {rule.weights.value}
                  </td>
                  <td className="py-2 pr-2 text-zinc-400">
                    {rule.weights.grind}
                  </td>
                  <td className="py-2 text-zinc-500">
                    {rule.aiGuidance.slice(0, 80)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Signal Taxonomy */}
      <Section title="BS Signal Taxonomy">
        <p className="mb-4 text-sm text-zinc-300">
          The AI looks for these specific signals in reviewer transcripts and
          game data.
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
            <strong className="text-white">Gemini 2.5 Flash</strong> — AI
            analysis and signal detection
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

function Pillar({ name, desc }: { name: string; desc: string }) {
  return (
    <div>
      <span className="text-sm font-semibold text-white">{name}</span>
      <p className="text-xs text-zinc-400">{desc}</p>
    </div>
  );
}
