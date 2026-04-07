import Link from "next/link";
import Image from "next/image";
import { BSMeterBars } from "@/components/bs-meter/BSMeterBars";
import type { VerdictKey } from "@/lib/types";

type GameCardProps = {
  slug: string;
  title: string;
  coverUrl: string | null;
  developer: string | null;
  genres: string[];
  bsScore: number | null;
  verdict: VerdictKey | null;
};

export function GameCard({
  slug,
  title,
  coverUrl,
  developer,
  genres,
  bsScore,
  verdict,
}: GameCardProps) {
  return (
    <Link
      href={`/games/${slug}`}
      className="group overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container transition-all hover:bg-surface-container-high hover:border-outline-variant/50 hover:shadow-lg"
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
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold font-headline text-on-surface">
              {title}
            </h3>
            {developer && (
              <p className="truncate text-xs text-on-surface-variant font-body mt-0.5">{developer}</p>
            )}
            {genres.length > 0 && (
              <p className="mt-1 truncate text-xs text-outline font-label">
                {genres.slice(0, 2).join(" / ")}
              </p>
            )}
          </div>
        </div>
        {bsScore !== null && (
          <div className="mt-3">
            <BSMeterBars bsScore={bsScore} />
          </div>
        )}
      </div>
    </Link>
  );
}
