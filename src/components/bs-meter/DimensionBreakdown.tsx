import { RadarChart } from "./RadarChart";

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
  { key: "story_quality" as const,        label: "Story Quality" },
  { key: "narrative_investment" as const, label: "Narrative Investment" },
  { key: "pacing" as const,               label: "Pacing" },
  { key: "combat_repetition" as const,    label: "Combat Variety" },
  { key: "boss_difficulty" as const,      label: "Boss Design" },
  { key: "exploration" as const,          label: "Exploration" },
  { key: "polish_bugs" as const,          label: "Polish & Stability" },
  { key: "ui_controls" as const,          label: "UI & Controls" },
  { key: "atmospheric_depth" as const,    label: "Atmosphere" },
];

function borderOpacity(score: number): string {
  if (score >= 9) return "border-primary";
  if (score >= 7) return "border-primary/60";
  if (score >= 5) return "border-primary/40";
  return "border-primary/20";
}

export function DimensionBreakdown(props: DimensionBreakdownProps) {
  const sorted = [...DIMENSIONS]
    .map((d) => ({ ...d, score: props[d.key] }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col lg:flex-row items-center gap-10">
      {/* Radar Chart */}
      <div className="relative w-full max-w-sm flex-shrink-0 aspect-square p-4">
        <RadarChart {...props} />
        <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Score list */}
      <div className="w-full space-y-2">
        {sorted.map((dim) => (
          <div
            key={dim.key}
            className={`flex justify-between items-center px-3 py-2.5 bg-surface-container-low border-l-4 rounded-r-lg ${borderOpacity(dim.score)}`}
          >
            <span className="font-headline font-bold text-sm tracking-tight text-on-surface">
              {dim.label}
            </span>
            <span className="text-primary font-black text-sm tabular-nums">
              {dim.score.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
