export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBSScoreLabel } from "@/lib/scoring/brackets";
import { GameCarousel } from "@/components/game/GameCarousel";
import type { VerdictKey } from "@/lib/types";

type GameRow = {
  slug: string;
  title: string;
  cover_url: string | null;
  developer: string | null;
  genres: string[];
  scores: { bs_score: number; verdict: VerdictKey } | null;
};

export default async function HomePage() {
  let formattedGames: GameRow[] = [];

  try {
    const supabase = createAdminClient();
    const { data: games } = await supabase
      .from("games")
      .select(
        `
        slug, title, cover_url, developer, genres,
        scores (bs_score, verdict)
      `
      )
      .eq("analysis_status", "complete")
      .order("analyzed_at", { ascending: false })
      .limit(20);

    formattedGames = (games || []).map((g) => ({
      ...g,
      scores: Array.isArray(g.scores) ? g.scores[0] || null : g.scores,
    }));
  } catch {
    // Supabase not configured yet — show empty state
  }

  const topRated = [...formattedGames]
    .filter((g) => g.scores)
    .sort((a, b) => (a.scores?.bs_score || 10) - (b.scores?.bs_score || 10));

  const mostBloated = [...formattedGames]
    .filter((g) => g.scores)
    .sort((a, b) => (b.scores?.bs_score || 0) - (a.scores?.bs_score || 0));

  return (
    <div className="min-h-screen">

      {/* ── TAGLINE ── */}
      <section className="px-8 pt-8 pb-6 border-b border-outline-variant/10">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="font-headline font-black tracking-tighter text-on-surface leading-none mb-2 text-4xl md:text-5xl">
            Find games that respect your time
          </h1>
          <p className="text-on-surface-variant font-body text-sm">
            We audit every title for hidden bloat, mindless grinding, and predatory microtransactions.
          </p>
        </div>
      </section>

      {/* ── MUST PLAY ── */}
      {topRated.length > 0 && (
        <section className="py-10 border-b border-outline-variant/10">
          <div className="mx-auto max-w-[1440px]">
            <div className="flex items-baseline justify-between px-8 mb-6">
              <div>
                <h2 className="font-headline font-bold text-2xl tracking-tighter text-on-surface">
                  Must Play
                </h2>
                <div className="w-8 h-0.5 bg-primary mt-1.5 rounded-full" />
              </div>
              <Link
                href="/games"
                className="text-xs font-label font-semibold uppercase tracking-widest text-outline hover:text-primary transition-colors"
              >
                See All →
              </Link>
            </div>
            <GameCarousel>
              {topRated.map((game, i) => (
                <GameRowCard key={game.slug} game={game} eager={i === 0} />
              ))}
            </GameCarousel>
          </div>
        </section>
      )}

      {/* ── HIGHEST BS SCORE ── */}
      {mostBloated.length > 0 && (
        <section className="py-10 border-b border-outline-variant/10">
          <div className="mx-auto max-w-[1440px]">
            <div className="flex items-baseline justify-between px-8 mb-6">
              <div>
                <h2 className="font-headline font-bold text-2xl tracking-tighter text-on-surface">
                  Highest BS Score
                </h2>
                <div className="w-8 h-0.5 bg-error mt-1.5 rounded-full" />
              </div>
              <Link
                href="/games"
                className="text-xs font-label font-semibold uppercase tracking-widest text-outline hover:text-primary transition-colors"
              >
                See All →
              </Link>
            </div>
            <GameCarousel>
              {mostBloated.map((game, i) => (
                <GameRowCard key={game.slug} game={game} eager={i === 0} />
              ))}
            </GameCarousel>
          </div>
        </section>
      )}

      {/* ── EMPTY STATE ── */}
      {formattedGames.length === 0 && (
        <section className="mx-auto max-w-[1440px] px-8 py-32 text-center">
          <p className="text-xl text-on-surface-variant font-body mb-2">
            No games analyzed yet.
          </p>
          <p className="text-sm text-outline font-label">
            POST /api/seed with your admin API key to begin.
          </p>
        </section>
      )}
    </div>
  );
}

function GameRowCard({ game, eager }: { game: GameRow; eager?: boolean }) {
  const bsLabel = game.scores ? getBSScoreLabel(game.scores.bs_score) : null;

  return (
    <Link
      href={`/games/${game.slug}`}
      className="group flex-shrink-0 w-36 md:w-40"
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-surface-container-high mb-3">
        {game.cover_url ? (
          <Image
            src={game.cover_url}
            alt={game.title}
            fill
            loading={eager ? "eager" : undefined}
            className="object-cover transition-transform group-hover:scale-105"
            sizes="160px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-on-surface-variant text-xs font-label">
            No Cover
          </div>
        )}
      </div>

      {/* Info */}
      <p className="text-sm font-headline font-bold text-on-surface truncate mb-1">
        {game.title}
      </p>
      {bsLabel && game.scores && (
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-headline font-black tabular-nums px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: `${bsLabel.color}20`,
              color: bsLabel.color,
            }}
          >
            {game.scores.bs_score.toFixed(1)}
          </span>
          <span className="text-xs font-label text-on-surface-variant truncate">
            {bsLabel.label}
          </span>
        </div>
      )}
    </Link>
  );
}
