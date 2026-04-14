import { NEGATIVE_SIGNALS, POSITIVE_SIGNALS } from "@/config/signal-taxonomy";
import { TRUSTED_REVIEWERS } from "@/config/trusted-reviewers";
import { BSGauge } from "@/components/bs-meter/BSGauge";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-white">Methodology</h1>
      <p className="mb-8 text-zinc-400">
        How BS Meter evaluates games and determines whether they respect your time.
      </p>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-12">
        <div className="shrink-0">
          <BSGauge score={4.0} showLabel />
        </div>
        <div className="space-y-4 pt-2 sm:pt-8">
          {[
            { label: "No wasted time",     color: "#22C55E", desc: "Nearly every moment has purpose. Tight pacing, no filler." },
            { label: "Minor friction",     color: "#EAB308", desc: "Some padding or repetition, but it doesn't derail the experience." },
            { label: "Noticeable padding", color: "#F97316", desc: "Filler inflates the runtime in ways that feel hollow." },
            { label: "Significant bloat",  color: "#EF4444", desc: "Chronic time waste — excessive grinding, repetition, or meaningless content." },
          ].map((tier) => (
            <div key={tier.label} className="flex items-start gap-3 text-xs">
              <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tier.color }} />
              <div>
                <span className="font-bold" style={{ color: tier.color }}>{tier.label}</span>
                <p className="text-zinc-500 mt-0.5">{tier.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The Rating System */}
      <Section title="The Rating System">
        <p className="mb-6 text-sm text-zinc-300">
          Every game is evaluated by pulling data from multiple sources — critic reviews, player sentiment,
          completion time data, and video reviewer transcripts — then analyzed by AI across 9 dimensions.
          Genre-adjusted weights determine the final verdict and BS score.
        </p>
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h4 className="mb-1 font-bold text-white">What we pull in</h4>
            <p className="text-xs text-zinc-400">
              Critic scores from OpenCritic, completion times from HowLongToBeat,
              video transcripts from trusted YouTube reviewers, community sentiment from Reddit
              via Perplexity, and game metadata from IGDB.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h4 className="mb-1 font-bold text-white">How we analyze it</h4>
            <p className="text-xs text-zinc-400">
              Gemini 2.5 Flash scores each game across 9 dimensions using all the data above.
              Weights shift by genre — a narrative RPG is judged primarily on story and pacing,
              while a Soulslike lives or dies on boss design and combat.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h4 className="mb-1 font-bold text-white">What you see</h4>
            <p className="text-xs text-zinc-400">
              A verdict (Must Play → Skip) reflecting overall game quality, and a BS score
              showing specifically how much the game respects your time. Both appear on every
              game tile and detail page.
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
