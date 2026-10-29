import { GameCard } from "./GameCard";
import type { ListedGame } from "@/lib/listing";

export function GameGrid({ games }: { games: ListedGame[] }) {
  if (games.length === 0) {
    return <div className="py-12 text-center font-label text-on-surface-variant">No games match these filters.</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {games.map((game) => (
        <GameCard
          key={game.slug}
          slug={game.slug}
          title={game.title}
          coverUrl={game.cover_url}
          verdict={game.scores?.verdict_v2 ?? null}
          bsIndex={game.scores?.bs_index ?? null}
        />
      ))}
    </div>
  );
}
