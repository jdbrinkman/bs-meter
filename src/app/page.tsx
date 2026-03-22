export const dynamic = "force-dynamic";

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { GameGrid } from "@/components/game/GameGrid";
import type { BracketKey } from "@/lib/types";

export default async function HomePage() {
  let formattedGames: { slug: string; title: string; cover_url: string | null; developer: string | null; genres: string[]; scores: { bs_score: number; bracket: BracketKey } | null }[] = [];

  try {
    const supabase = createAdminClient();
    const { data: games } = await supabase
      .from("games")
      .select(
        `
        slug, title, cover_url, developer, genres,
        scores (bs_score, bracket)
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

  // Split into featured categories
  const leanest = [...formattedGames]
    .filter((g) => g.scores)
    .sort((a, b) => (b.scores?.bs_score || 0) - (a.scores?.bs_score || 0))
    .slice(0, 5);

  const mostBloated = [...formattedGames]
    .filter((g) => g.scores)
    .sort((a, b) => (a.scores?.bs_score || 0) - (b.scores?.bs_score || 0))
    .slice(0, 5);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600 text-2xl font-black text-white">
            BS
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
            Cut Through the Content
          </h1>
          <p className="mb-8 text-lg text-zinc-400">
            AI-powered scoring that detects bloat, filler, and grind in video
            games. Find games that respect your time.
          </p>
          <Link
            href="/games"
            className="inline-flex items-center rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Browse All Games
          </Link>
        </div>
      </section>

      {/* Bracket Legend */}
      <section className="border-b border-zinc-800 px-4 py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 text-xs">
          <span className="font-bold text-blue-500">9-10 Lean Masterpiece</span>
          <span className="text-zinc-700">|</span>
          <span className="font-bold text-green-500">7-8 High Signal</span>
          <span className="text-zinc-700">|</span>
          <span className="font-bold text-yellow-500">5-6 Fair Trade</span>
          <span className="text-zinc-700">|</span>
          <span className="font-bold text-orange-500">3-4 Content Sludge</span>
          <span className="text-zinc-700">|</span>
          <span className="font-bold text-red-500">1-2 Clock Puncher</span>
        </div>
      </section>

      {/* Leanest Games */}
      {leanest.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-bold text-white">
            Leanest Games
          </h2>
          <GameGrid games={leanest} />
        </section>
      )}

      {/* Most Bloated */}
      {mostBloated.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-bold text-white">
            Most Bloated
          </h2>
          <GameGrid games={mostBloated} />
        </section>
      )}

      {/* Empty state */}
      {formattedGames.length === 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 text-center">
          <p className="text-lg text-zinc-500">
            No games analyzed yet. Run the seed pipeline to get started!
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            POST /api/seed with your admin API key to begin.
          </p>
        </section>
      )}
    </div>
  );
}
