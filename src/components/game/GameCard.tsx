import Link from "next/link";
import Image from "next/image";
import { VERDICTS, bsColor, type VerdictKey as V2Key } from "@/lib/scoring/v2";
import { VerdictIcon } from "./VerdictIcon";
import type { VerdictKey } from "@/lib/types";

type GameCardProps = {
  slug: string;
  title: string;
  coverUrl: string | null;
  developer: string | null;
  genres: string[];
  bsScore: number | null;
  verdict: VerdictKey | null;
  verdictV2?: V2Key | null;
  bsIndex?: number | null;
};

export function GameCard({ slug, title, coverUrl, verdictV2, bsIndex }: GameCardProps) {
  const v = verdictV2 ? VERDICTS[verdictV2] : null;
  const color = v?.color ?? null;

  return (
    <Link
      href={`/games/${slug}`}
      className="group overflow-hidden rounded-2xl bg-surface-container transition-all hover:bg-surface-container-high"
      style={color ? {
        border: `1px solid ${color}40`,
      } : {
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-container-high">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-on-surface-variant text-xs font-label">
            No Cover
          </div>
        )}

      </div>

      <div className="px-3 py-2">
        <h3 className="truncate text-sm font-bold font-headline text-on-surface">
          {title}
        </h3>
        {v && verdictV2 && (
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-headline font-black" style={{ color: v.color }}>
              <VerdictIcon kind={verdictV2} size={14} color={v.color} />
              {v.label}
            </span>
            {bsIndex != null && (
              <span className="text-[10px] font-label tabular-nums" style={{ color: bsColor(bsIndex) }}>
                BS {bsIndex}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
