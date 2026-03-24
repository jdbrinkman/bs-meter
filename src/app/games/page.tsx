export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { GameGrid } from "@/components/game/GameGrid";
import { VERDICTS } from "@/lib/scoring/brackets";
import type { VerdictKey } from "@/lib/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function GamesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const verdict = params.verdict as string | undefined;

  let formattedGames: {
    slug: string;
    title: string;
    cover_url: string | null;
    developer: string | null;
    genres: string[];
    scores: { bs_score: number; verdict: VerdictKey } | null;
  }[] = [];

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
      .order("analyzed_at", { ascending: false });

    formattedGames = (games || []).map((g) => ({
      ...g,
      scores: Array.isArray(g.scores) ? g.scores[0] || null : g.scores,
    }));
  } catch {
    // Supabase not configured yet
  }

  // Filter by verdict
  if (verdict) {
    formattedGames = formattedGames.filter(
      (g) => g.scores?.verdict === verdict
    );
  }

  // Sort by bs_score ascending (lowest BS = cleanest)
  formattedGames.sort(
    (a, b) => (a.scores?.bs_score || 10) - (b.scores?.bs_score || 10)
  );

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-12">
      <h1 className="mb-2 text-4xl font-black font-headline tracking-tighter text-on-surface">
        Browse Games
      </h1>
      <p className="mb-8 text-on-surface-variant font-label text-sm">
        {formattedGames.length} games analyzed
      </p>

      {/* Verdict Filters */}
      <div className="mb-8 flex flex-wrap gap-2">
        <FilterChip href="/games" label="All" active={!verdict} />
        {(Object.keys(VERDICTS) as VerdictKey[]).map((key) => (
          <FilterChip
            key={key}
            href={`/games?verdict=${key}`}
            label={VERDICTS[key].label}
            color={VERDICTS[key].color}
            active={verdict === key}
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
      className="rounded-full border px-4 py-1.5 text-xs font-label font-medium transition-all"
      style={
        active
          ? {
              backgroundColor: color || "#3fff8b",
              borderColor: color || "#3fff8b",
              color: "#005d2c",
            }
          : {
              borderColor: "#494847",
              color: "#adaaaa",
            }
      }
    >
      {label}
    </a>
  );
}
