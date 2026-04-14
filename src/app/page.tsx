export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { GameCarousel } from "@/components/game/GameCarousel";
import { BS_TIERS } from "@/lib/scoring/brackets";
import type { VerdictKey } from "@/lib/types";

function getSection(score: number) {
  return BS_TIERS.find((s) => score <= s.max) ?? BS_TIERS[3];
}

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

  const gamesWithScores = formattedGames.filter((g) => g.scores !== null);

  const tierGroups = BS_TIERS.map((tier, i) => {
    const min = i === 0 ? -Infinity : BS_TIERS[i - 1].max;
    return {
      tier,
      games: gamesWithScores
        .filter((g) => {
          const score = g.scores!.bs_score;
          return score > min && score <= tier.max;
        })
        .sort((a, b) => a.scores!.bs_score - b.scores!.bs_score),
    };
  });

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

      {/* ── TIER SECTIONS ── */}
      {tierGroups.map(({ tier, games }) =>
        games.length > 0 && (
          <section key={tier.label} className="py-10 border-b border-outline-variant/10">
            <div className="mx-auto max-w-[1440px]">
              <div className="flex items-baseline justify-between px-8 mb-6">
                <div>
                  <h2
                    className="font-headline font-bold text-2xl tracking-tighter"
                    style={{ color: tier.color }}
                  >
                    {tier.label}
                  </h2>
                  <div
                    className="w-8 h-0.5 mt-1.5 rounded-full"
                    style={{ backgroundColor: tier.color }}
                  />
                  <p className="mt-2 text-xs text-on-surface-variant font-label">
                    {tier.desc}
                  </p>
                </div>
                <Link
                  href="/games"
                  className="text-xs font-label font-semibold uppercase tracking-widest text-outline hover:text-primary transition-colors"
                >
                  See All →
                </Link>
              </div>
              <GameCarousel>
                {games.map((game, i) => (
                  <GameRowCard key={game.slug} game={game} eager={i === 0} />
                ))}
              </GameCarousel>
            </div>
          </section>
        )
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
  const section = game.scores ? getSection(game.scores.bs_score) : null;
  const color = section?.color ?? null;

  return (
    <Link
      href={`/games/${game.slug}`}
      className="group flex-shrink-0 w-36 md:w-40"
    >
      {/* Cover */}
      <div
        className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-surface-container-high mb-3"
        style={color ? {
          border: `1px solid ${color}50`,
          boxShadow: `0 0 12px ${color}30, 0 0 28px ${color}15`,
        } : {
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
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
      <p className="text-sm font-headline font-bold text-on-surface truncate mt-2">
        {game.title}
      </p>
      {section && (
        <p
          className="mt-0.5 text-[8px] font-headline font-black uppercase tracking-[0.1em]"
          style={{ color: section.color }}
        >
          {section.label}
        </p>
      )}
    </Link>
  );
}
