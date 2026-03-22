export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { GameGrid } from "@/components/game/GameGrid";
import { BRACKETS } from "@/lib/scoring/brackets";
import type { BracketKey } from "@/lib/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function GamesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const bracket = params.bracket as string | undefined;

  let formattedGames: { slug: string; title: string; cover_url: string | null; developer: string | null; genres: string[]; scores: { bs_score: number; bracket: BracketKey } | null }[] = [];

  try {
    const supabase = createAdminClient();
    const query = supabase
      .from("games")
      .select(
        `
        slug, title, cover_url, developer, genres,
        scores (bs_score, bracket)
      `
      )
      .eq("analysis_status", "complete")
      .order("analyzed_at", { ascending: false });

    const { data: games } = await query;

    formattedGames = (games || []).map((g) => ({
      ...g,
      scores: Array.isArray(g.scores) ? g.scores[0] || null : g.scores,
    }));
  } catch {
    // Supabase not configured yet
  }

  // Client-side bracket filter (since we can't filter on joined tables easily)
  if (bracket) {
    formattedGames = formattedGames.filter(
      (g) => g.scores?.bracket === bracket
    );
  }

  // Sort by score descending
  formattedGames.sort(
    (a, b) => (b.scores?.bs_score || 0) - (a.scores?.bs_score || 0)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-white">Browse Games</h1>
      <p className="mb-8 text-zinc-400">
        {formattedGames.length} games analyzed
      </p>

      {/* Bracket Filters */}
      <div className="mb-8 flex flex-wrap gap-2">
        <FilterChip href="/games" label="All" active={!bracket} />
        {(Object.keys(BRACKETS) as BracketKey[]).map((key) => (
          <FilterChip
            key={key}
            href={`/games?bracket=${key}`}
            label={BRACKETS[key].label}
            color={BRACKETS[key].color}
            active={bracket === key}
          />
        ))}
      </div>

      <GameGrid games={formattedGames} />
    </div>
  );
}

function FilterChip({
  href,
  label,
  color,
  active,
}: {
  href: string;
  label: string;
  color?: string;
  active: boolean;
}) {
  return (
    <a
      href={href}
      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
        active
          ? "border-white bg-white text-black"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
      }`}
      style={
        active && color
          ? { backgroundColor: color, borderColor: color, color: "white" }
          : undefined
      }
    >
      {label}
    </a>
  );
}
