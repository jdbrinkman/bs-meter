import { GameCard } from "./GameCard";
import type { VerdictKey } from "@/lib/types";
import type { VerdictKey as V2Key } from "@/lib/scoring/v2";

type GameGridItem = {
  slug: string;
  title: string;
  cover_url: string | null;
  developer: string | null;
  genres: string[];
  scores: {
    verdict_v2?: V2Key | null;
    bs_index?: number | null;
    bs_score: number;
    verdict: VerdictKey;
  } | null;
};

type GameGridProps = {
  games: GameGridItem[];
};

export function GameGrid({ games }: GameGridProps) {
  if (games.length === 0) {
    return (
      <div className="py-12 text-center text-on-surface-variant font-label">
        No games found. Check back soon!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {games.map((game) => (
        <GameCard
          key={game.slug}
          slug={game.slug}
          title={game.title}
          coverUrl={game.cover_url}
          developer={game.developer}
          genres={game.genres}
          bsScore={game.scores?.bs_score ?? null}
          verdict={game.scores?.verdict ?? null}
          verdictV2={game.scores?.verdict_v2 ?? null}
          bsIndex={game.scores?.bs_index ?? null}
        />
      ))}
    </div>
  );
}
