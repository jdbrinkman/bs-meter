type PillarBreakdownProps = {
  pacing: number;
  bloat: number;
  value: number;
  grind: number;
};

const pillars = [
  {
    key: "pacing" as const,
    label: "Pacing & Flow",
    description: "Does it keep the fun coming?",
  },
  {
    key: "bloat" as const,
    label: "Bloat Ratio",
    description: "How much is filler?",
  },
  {
    key: "value" as const,
    label: "Value / Cost",
    description: "Price vs quality hours",
  },
  {
    key: "grind" as const,
    label: "Grind Factor",
    description: "Earned or forced?",
  },
];

function getBarColor(score: number): string {
  if (score >= 9) return "bg-blue-500";
  if (score >= 7) return "bg-green-500";
  if (score >= 5) return "bg-yellow-500";
  if (score >= 3) return "bg-orange-500";
  return "bg-red-500";
}

export function PillarBreakdown(props: PillarBreakdownProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Pillar Breakdown
      </h3>
      {pillars.map((pillar) => {
        const score = props[pillar.key];
        return (
          <div key={pillar.key}>
            <div className="mb-1 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-white">
                  {pillar.label}
                </span>
                <span className="ml-2 text-xs text-zinc-500">
                  {pillar.description}
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
