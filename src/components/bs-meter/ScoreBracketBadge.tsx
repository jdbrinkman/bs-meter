import { getVerdictInfo } from "@/lib/scoring/brackets";
import type { VerdictKey } from "@/lib/types";

type ScoreBracketBadgeProps = {
  bracket: VerdictKey;
};

export function ScoreBracketBadge({ bracket }: ScoreBracketBadgeProps) {
  const info = getVerdictInfo(bracket);

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white"
      style={{ backgroundColor: info.color }}
    >
      {info.label}
    </span>
  );
}
