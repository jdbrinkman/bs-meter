import { getVerdictInfo } from "@/lib/scoring/brackets";
import type { VerdictKey } from "@/lib/types";

type ScoreBracketBadgeProps = {
  bracket: VerdictKey;
};

export function ScoreBracketBadge({ bracket }: ScoreBracketBadgeProps) {
  const info = getVerdictInfo(bracket);

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold font-headline tracking-wide"
      style={{
        backgroundColor: `${info.color}20`,
        color: info.color,
        border: `1px solid ${info.color}40`,
      }}
    >
      {info.label}
    </span>
  );
}
