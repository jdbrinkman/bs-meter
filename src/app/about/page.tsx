import { TRUSTED_REVIEWERS } from "@/config/trusted-reviewers";
import { PRIORITY_OUTLETS } from "@/config/critic-outlets";
import { JUICE, SQUEEZE, VERDICTS, VERDICT_RULES as R, BS_TOP_WEIGHTS, type VerdictKey } from "@/lib/scoring/v2";
import { VerdictIcon } from "@/components/game/VerdictIcon";

const VERDICT_MEANING: Record<VerdictKey, string> = {
  "worth-it": `Good game, manageable BS, fair price. Juice of ${R.worthJuiceCheap}+ (${R.worthJuiceExpensive}+ above $${R.expensiveAbove}) and BS of ${R.worthBsAtMost} or less.`,
  wait: "A good game that is not a good deal at today's price, or one with enough BS that it should be cheaper.",
  "not-yet": `A recent release (under ${R.notYetMaxAgeMonths} months) that is still too broken to recommend. Check back after patches.`,
  skip: `Juice under ${R.skipJuiceBelow}, or heavy BS (${R.skipBsAtLeast}+) without enough good to justify it.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 font-headline text-3xl font-black text-on-surface">Methodology</h1>
      <p className="mb-10 font-body text-on-surface-variant">
        How we decide whether a game is worth your time and your money, and where that judgment can be wrong.
      </p>

      <Section title="One verdict, two numbers">
        <p className="mb-4 text-sm text-on-surface-variant">
          Every game gets a verdict and two numbers from 0 to 100. <strong className="text-on-surface">Juice</strong> is how
          good the game is (higher is better). <strong className="text-on-surface">BS</strong> is how much it wastes your time
          or money (lower is better). The verdict weighs both against today&apos;s price.
        </p>
        <div className="space-y-3">
          {(Object.keys(VERDICTS) as VerdictKey[]).map((k) => (
            <div key={k} className="flex items-start gap-3 rounded-xl bg-surface-container p-4">
              <VerdictIcon kind={k} size={22} color={VERDICTS[k].color} />
              <div>
                <p className="font-headline font-bold" style={{ color: VERDICTS[k].color }}>{VERDICTS[k].label}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant">{VERDICT_MEANING[k]}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="The 12 measures">
        <p className="mb-4 text-sm text-on-surface-variant">
          Each game is rated 1 to 5 on the same 12 measures, with a one-line reason for each. On the BS side 1 means
          negligible and 5 severe; on the juice side 1 means poor and 5 best in class. A juice measure that does not exist in
          a kind of game (a story in a competitive shooter) is marked not applicable, and a measure our sources never
          discuss is marked not discussed. Neither is counted as a good or a bad score. Every complaint is counted in exactly
          one measure, so one problem cannot be punished twice.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <MeasureList title="The juice" color="#22C55E" items={JUICE} />
          <MeasureList title="The BS" color="#EF4444" items={SQUEEZE} />
        </div>
      </Section>

      <Section title="How the numbers are built">
        <ul className="space-y-3 text-sm text-on-surface-variant">
          <li>
            <strong className="text-on-surface">Ratings come from an AI reading the evidence.</strong> It rates the 12 measures
            against written rubrics, in two steps: first it lists the specific issues the sources raise, with quotes, then it
            rates each measure from that list and cites it. It does not choose the verdict.
          </li>
          <li>
            <strong className="text-on-surface">Juice</strong> is a weighted average of the juice ratings. Weights depend on the
            kind of game: story counts for more in a narrative RPG, staying power for more in a roguelike.
          </li>
          <li>
            <strong className="text-on-surface">BS</strong> is driven by the worst of its six measures, so one severe problem cannot
            be averaged away. The three worst measures count {BS_TOP_WEIGHTS.map((w) => `${w * 100}%`).join(", ")}. A clean game
            scores 0. Because five-level ratings are coarse, the numbers are shown to the nearest 5.
          </li>
          <li>
            <strong className="text-on-surface">The verdict</strong> is a fixed rule applied to those numbers and the price. The
            same ratings always give the same verdict, and the rules are the ones listed above.
          </li>
        </ul>
      </Section>

      <Section title="What we read">
        <ul className="space-y-3 text-sm text-on-surface-variant">
          <li>
            <strong className="text-on-surface">Video reviews.</strong> Transcripts from {TRUSTED_REVIEWERS.length} reviewer
            channels: {TRUSTED_REVIEWERS.map((r) => r.channelName).join(", ")}.
          </li>
          <li>
            <strong className="text-on-surface">Written reviews.</strong> Full text of up to five critic reviews per game from
            outlets such as {PRIORITY_OUTLETS.slice(0, 5).join(", ")}, found through OpenCritic. We list every critic review
            we found under Sources on each game.
          </li>
          <li>
            <strong className="text-on-surface">Player reviews.</strong> On Steam: the most helpful positive and negative reviews
            from players with 20+ hours, plus how the last 30 days compare with all time.
          </li>
          <li>
            <strong className="text-on-surface">Store facts.</strong> Current Steam price, in-app purchases, DLC and achievement
            rates, plus price history from IsThereAnyDeal. Time to beat comes from HowLongToBeat, with IGDB community data as a cross-check and fallback. Release data comes from IGDB.
          </li>
        </ul>
      </Section>

      <Section title="Limits you should know about">
        <ul className="space-y-3 text-sm text-on-surface-variant">
          <li>The ratings are an AI&apos;s reading of reviews, not a measurement. A game with few reviews gets a less certain rating.</li>
          <li>Steam player evidence reflects the PC version. Console-only games are judged on reviewers and critics.</li>
          <li>Verdicts use today&apos;s Steam price where there is one. Games not on Steam show a list price instead, labeled as such.</li>
          <li>Reviews describe a game at the time they were written. Patches can make older complaints out of date.</li>
          <li>The weights and verdict rules are our judgment calls, and we change them as we test them.</li>
        </ul>
      </Section>
    </div>
  );
}

function MeasureList({ title, color, items }: { title: string; color: string; items: { key: string; label: string; summary: string }[] }) {
  return (
    <div className="rounded-xl bg-surface-container p-5">
      <h3 className="mb-3 font-headline text-sm font-black uppercase tracking-widest" style={{ color }}>{title}</h3>
      <ul className="space-y-3">
        {items.map((m) => (
          <li key={m.key}>
            <p className="font-headline text-sm font-bold text-on-surface">{m.label}</p>
            <p className="text-xs text-on-surface-variant">{m.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 font-headline text-xl font-bold text-on-surface">{title}</h2>
      {children}
    </section>
  );
}
