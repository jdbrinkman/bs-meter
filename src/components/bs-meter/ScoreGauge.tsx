import { getBracketInfo } from "@/lib/scoring/brackets";
import type { BracketKey } from "@/lib/types";

type ScoreGaugeProps = {
  score: number;
  bracket: BracketKey;
  size?: "sm" | "md" | "lg";
};

export function ScoreGauge({ score, bracket, size = "md" }: ScoreGaugeProps) {
  const info = getBracketInfo(bracket);

  const sizeClasses = {
    sm: "h-14 w-14 text-lg",
    md: "h-24 w-24 text-3xl",
    lg: "h-32 w-32 text-4xl",
  };

  const labelClasses = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full border-4 font-black`}
        style={{
          borderColor: info.color,
          color: info.color,
        }}
      >
        {score.toFixed(1)}
      </div>
      <span
        className={`${labelClasses[size]} font-semibold`}
        style={{ color: info.color }}
      >
        {info.label}
      </span>
    </div>
  );
}
