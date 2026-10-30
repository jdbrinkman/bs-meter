import Link from "next/link";
import Image from "next/image";
import { VERDICTS, bsColor, displayIndex, type VerdictKey } from "@/lib/scoring/v2";
import { VerdictIcon } from "./VerdictIcon";

type GameCardProps = {
  slug: string;
  title: string;
  coverUrl: string | null;
  verdict: VerdictKey | null;
  bsIndex: number | null;
};

export function GameCard({ slug, title, coverUrl, verdict, bsIndex }: GameCardProps) {
  const v = verdict ? VERDICTS[verdict] : null;

  return (
    <Link
      href={`/games/${slug}`}
      className="group overflow-hidden rounded-2xl bg-surface-container transition-all hover:bg-surface-container-high"
      style={{ border: `1px solid ${v ? `${v.color}40` : "rgba(255,255,255,0.08)"}` }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-container-high">
        {coverUrl ? (
          <Image src={coverUrl} alt={title} fill className="object-cover transition-transform group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" />
        ) : (
          <div className="flex h-full items-center justify-center font-label text-xs text-on-surface-variant">No Cover</div>
        )}
      </div>

      <div className="px-3 py-2">
        <h3 className="truncate font-headline text-sm font-bold text-on-surface">{title}</h3>
        {v && verdict ? (
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-headline text-[11px] font-black" style={{ color: v.color }}>
              <VerdictIcon kind={verdict} size={14} color={v.color} />
              {v.label}
            </span>
            {bsIndex != null && (
              <span className="font-label text-[10px] tabular-nums" style={{ color: bsColor(bsIndex) }}>
                BS {displayIndex(bsIndex)}
              </span>
            )}
          </div>
        ) : (
          <p className="mt-1 font-label text-[11px] text-on-surface-variant">Not rated yet</p>
        )}
      </div>
    </Link>
  );
}
