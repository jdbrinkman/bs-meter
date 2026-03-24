import { getBSScoreLabel } from "@/lib/scoring/brackets";

type ScoreGaugeProps = {
  bsScore: number;
  size?: "sm" | "md" | "lg";
};

export function ScoreGauge({ bsScore, size = "md" }: ScoreGaugeProps) {
  const bsLabel = getBSScoreLabel(bsScore);

  if (size === "sm") {
    return (
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <div
          className="rounded-lg px-2 py-1 border text-right"
          style={{
            borderColor: `${bsLabel.color}40`,
            backgroundColor: `${bsLabel.color}12`,
          }}
        >
          <span
            className="text-lg font-black font-headline tabular-nums leading-none"
            style={{ color: bsLabel.color }}
          >
            {bsScore.toFixed(1)}
          </span>
        </div>
        <span className="text-[10px] font-label text-on-surface-variant pr-0.5">
          BS /10
        </span>
      </div>
    );
  }

  if (size === "md") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className="rounded-xl px-4 py-2 border"
          style={{
            borderColor: `${bsLabel.color}40`,
            backgroundColor: `${bsLabel.color}12`,
          }}
        >
          <span
            className="text-3xl font-black font-headline tabular-nums"
            style={{ color: bsLabel.color }}
          >
            {bsScore.toFixed(1)}
          </span>
        </div>
        <span className="text-xs font-label text-on-surface-variant">BS /10</span>
        <span className="text-xs font-label font-semibold" style={{ color: bsLabel.color }}>
          {bsLabel.label}
        </span>
      </div>
    );
  }

  // lg
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="rounded-2xl px-6 py-3 border"
        style={{
          borderColor: `${bsLabel.color}40`,
          backgroundColor: `${bsLabel.color}12`,
        }}
      >
        <span
          className="text-5xl font-black font-headline tabular-nums"
          style={{ color: bsLabel.color }}
        >
          {bsScore.toFixed(1)}
        </span>
      </div>
      <span className="text-sm font-label text-on-surface-variant">BS /10</span>
      <span className="text-sm font-label font-semibold" style={{ color: bsLabel.color }}>
        {bsLabel.label}
      </span>
    </div>
  );
}
