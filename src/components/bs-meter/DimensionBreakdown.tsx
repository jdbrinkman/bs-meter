type DimensionBreakdownProps = {
  story_quality: number;
  narrative_investment: number;
  pacing: number;
  combat_repetition: number;
  boss_difficulty: number;
  exploration: number;
  polish_bugs: number;
  ui_controls: number;
  atmospheric_depth: number;
};

const DIMENSIONS = [
  {
    key: "story_quality" as const,
    label: "Story Quality",
    description: "Writing, narrative structure, emotional impact",
  },
  {
    key: "narrative_investment" as const,
    label: "Narrative Investment",
    description: "How much you care about characters & arcs",
  },
  {
    key: "pacing" as const,
    label: "Pacing",
    description: "Does every hour earn its keep?",
  },
  {
    key: "combat_repetition" as const,
    label: "Combat Variety",
    description: "Does combat stay fresh throughout?",
  },
  {
    key: "boss_difficulty" as const,
    label: "Boss Design",
    description: "Quality, fairness, and memorability of bosses",
  },
  {
    key: "exploration" as const,
    label: "Exploration",
    description: "How rewarding is world discovery?",
  },
  {
    key: "polish_bugs" as const,
    label: "Polish & Stability",
    description: "Bug-free, stable, technically sound",
  },
  {
    key: "ui_controls" as const,
    label: "UI & Controls",
    description: "Intuitive, responsive, gets out of the way",
  },
  {
    key: "atmospheric_depth" as const,
    label: "Atmosphere",
    description: "Immersion, world-building, tonal cohesion",
  },
];

function getBarColor(score: number): string {
  if (score >= 9) return "bg-blue-500";
  if (score >= 7) return "bg-green-500";
  if (score >= 5) return "bg-yellow-500";
  if (score >= 3) return "bg-orange-500";
  return "bg-red-500";
}

export function DimensionBreakdown(props: DimensionBreakdownProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Dimension Breakdown
      </h3>
      {DIMENSIONS.map((dim) => {
        const score = props[dim.key];
        return (
          <div key={dim.key}>
            <div className="mb-1 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-white">
                  {dim.label}
                </span>
                <span className="ml-2 text-xs text-zinc-500">
                  {dim.description}
                </span>
              </div>
              <span className="text-sm font-bold text-white">
                {score.toFixed(1)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(score)}`}
                style={{ width: `${(score / 10) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
