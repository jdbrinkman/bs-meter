import { getVerdictInfo, getBSScoreLabel } from "@/lib/scoring/brackets";
import type { VerdictKey } from "@/lib/types";

type ScoreGaugeProps = {
  enjoymentScore: number;
  bsScore: number;
  verdict: VerdictKey;
  size?: "sm" | "md" | "lg";
};

export function ScoreGauge({
  enjoymentScore,
  bsScore,
  verdict,
  size = "md",
}: ScoreGaugeProps) {
  const verdictInfo = getVerdictInfo(verdict);
  const bsLabel = getBSScoreLabel(bsScore);

  const enjoymentSizeClasses = {
    sm: "h-16 w-16 text-xl",
    md: "h-24 w-24 text-3xl",
    lg: "h-32 w-32 text-4xl",
  };

  const bsSizeClasses = {
    sm: "h-10 w-10 text-sm",
    md: "h-16 w-16 text-lg",
    lg: "h-20 w-20 text-2xl",
  };

  const labelClasses = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <div className="flex items-end gap-4">
      {/* Enjoyment Score — primary */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={`${enjoymentSizeClasses[size]} flex items-center justify-center rounded-full border-4 font-black`}
          style={{ borderColor: verdictInfo.color, color: verdictInfo.color }}
        >
          {enjoymentScore}
        </div>
        <span className={`${labelClasses[size]} text-zinc-400`}>/100</span>
        <span
          className={`${labelClasses[size]} font-semibold`}
          style={{ color: verdictInfo.color }}
        >
          {verdictInfo.label}
        </span>
      </div>

      {/* BS Score — secondary */}
      <div className="flex flex-col items-center gap-1 mb-4">
        <div
          className={`${bsSizeClasses[size]} flex items-center justify-center rounded-full border-2 font-bold`}
          style={{ borderColor: bsLabel.color, color: bsLabel.color }}
        >
          {bsScore.toFixed(1)}
        </div>
        <span className={`${labelClasses[size]} text-zinc-400`}>BS /10</span>
      </div>
    </div>
  );
}
