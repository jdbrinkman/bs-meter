import Link from "next/link";
import Image from "next/image";
import { ScoreGauge } from "@/components/bs-meter/ScoreGauge";
import { ScoreBracketBadge } from "@/components/bs-meter/ScoreBracketBadge";
import type { BracketKey } from "@/lib/types";

type GameCardProps = {
  slug: string;
  title: string;
  coverUrl: string | null;
  developer: string | null;
  genres: string[];
  score: number | null;
  bracket: BracketKey | null;
};

export function GameCard({
  slug,
  title,
  coverUrl,
  developer,
  genres,
  score,
  bracket,
}: GameCardProps) {
  return (
    <Link
      href={`/games/${slug}`}
      className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-600 hover:shadow-lg"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-800">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-600">
            No Cover
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white">
              {title}
            </h3>
            {developer && (
              <p className="truncate text-xs text-zinc-500">{developer}</p>
            )}
            {genres.length > 0 && (
              <p className="mt-1 truncate text-xs text-zinc-600">
                {genres.slice(0, 2).join(" / ")}
              </p>
            )}
          </div>
          {score !== null && bracket !== null && (
            <ScoreGauge score={score} bracket={bracket} size="sm" />
          )}
        </div>
        {bracket && (
          <div className="mt-3">
            <ScoreBracketBadge bracket={bracket} />
          </div>
        )}
      </div>
    </Link>
  );
}
