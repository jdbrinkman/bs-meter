import { getBracketInfo } from "@/lib/scoring/brackets";
import type { BracketKey } from "@/lib/types";

type ScoreBracketBadgeProps = {
  bracket: BracketKey;
};

export function ScoreBracketBadge({ bracket }: ScoreBracketBadgeProps) {
  const info = getBracketInfo(bracket);

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white"
      style={{ backgroundColor: info.color }}
    >
      {info.label}
    </span>
  );
}
