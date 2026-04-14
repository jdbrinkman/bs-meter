export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { GameGrid } from "@/components/game/GameGrid";
import { BS_TIERS } from "@/lib/scoring/brackets";
import type { VerdictKey } from "@/lib/types";

const GENRE_LABELS: Record<string, string> = {
  "narrative-rpg": "Narrative RPG",
  "soulslike": "Soulslike",
  "soulslike-blended": "Soulslike (Blended)",
  "action-adventure": "Action Adventure",
  "roguelike": "Roguelike",
  "roguelike-atmospheric": "Roguelike (Atm.)",
  "platformer-metroidvania": "Platformer",
  "puzzle-narrative": "Puzzle",
  "pure-gameplay": "Pure Gameplay",
  "narrative-open-world": "Open World",
  "action-horror": "Horror",
  "crpg": "CRPG",
  "pvpve-extraction": "Extraction",
  "default": "Other",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function GamesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const activeTier = params.tier as string | undefined;
  const activeGenre = params.genre as string | undefined;

  let allGames: {
    slug: string;
    title: string;
    cover_url: string | null;
    developer: string | null;
    genres: string[];
    scores: { bs_score: number; verdict: VerdictKey; genre_rule_applied: string | null } | null;
  }[] = [];

  try {
    const supabase = createAdminClient();
    const { data: games } = await supabase
      .from("games")
      .select(
        `
        slug, title, cover_url, developer, genres,
        scores (bs_score, verdict, genre_rule_applied)
      `
      )
      .eq("analysis_status", "complete")
      .order("analyzed_at", { ascending: false });

    allGames = (games || []).map((g) => ({
      ...g,
      scores: Array.isArray(g.scores) ? g.scores[0] || null : g.scores,
    }));
  } catch {
    // Supabase not configured yet
  }

  // Collect unique genres present in the full dataset (for filter chips)
  const availableGenres = Array.from(
    new Set(
      allGames
        .map((g) => g.scores?.genre_rule_applied)
        .filter((g): g is string => !!g)
    )
  ).sort((a, b) => (GENRE_LABELS[a] || a).localeCompare(GENRE_LABELS[b] || b));

  // Apply filters
  let filteredGames = allGames.filter((g) => g.scores !== null);

  if (activeTier) {
    const tier = BS_TIERS.find(
      (t) => t.label.toLowerCase() === activeTier.toLowerCase()
    );
    if (tier) {
      const tierIndex = BS_TIERS.indexOf(tier);
      const min = tierIndex === 0 ? -Infinity : BS_TIERS[tierIndex - 1].max;
      filteredGames = filteredGames.filter((g) => {
        const score = g.scores!.bs_score;
        return score > min && score <= tier.max;
      });
    }
  }

  if (activeGenre) {
    filteredGames = filteredGames.filter(
      (g) => g.scores?.genre_rule_applied === activeGenre
    );
  }

  // Sort by bs_score ascending (cleanest first)
  filteredGames.sort(
    (a, b) => (a.scores?.bs_score || 10) - (b.scores?.bs_score || 10)
  );

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-12">
      <h1 className="mb-2 text-4xl font-black font-headline tracking-tighter text-on-surface">
        Browse Games
      </h1>
      <p className="mb-8 text-on-surface-variant font-label text-sm">
        {filteredGames.length} games analyzed
      </p>

      {/* BS Rating Filters */}
      <div className="mb-4">
        <p className="mb-2 text-[10px] font-label font-semibold uppercase tracking-widest text-outline">
          BS Rating
        </p>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            href={buildUrl(undefined, activeGenre)}
            label="All"
            active={!activeTier}
          />
          {BS_TIERS.map((tier) => (
            <FilterChip
              key={tier.label}
              href={buildUrl(tier.label.toLowerCase(), activeGenre)}
              label={tier.label}
              color={tier.color}
              active={activeTier === tier.label.toLowerCase()}
            />
          ))}
        </div>
      </div>

      {/* Genre Filters */}
      {availableGenres.length > 0 && (
        <div className="mb-10">
          <p className="mb-2 text-[10px] font-label font-semibold uppercase tracking-widest text-outline">
            Genre
          </p>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              href={buildUrl(activeTier, undefined)}
              label="All"
              active={!activeGenre}
            />
            {availableGenres.map((genre) => (
              <FilterChip
                key={genre}
                href={buildUrl(activeTier, genre)}
                label={GENRE_LABELS[genre] || genre}
                active={activeGenre === genre}
              />
            ))}
          </div>
        </div>
      )}

      <GameGrid games={filteredGames} />
    </div>
  );
}

function buildUrl(tier: string | undefined, genre: string | undefined): string {
  const params = new URLSearchParams();
  if (tier) params.set("tier", tier);
  if (genre) params.set("genre", genre);
  const qs = params.toString();
  return qs ? `/games?${qs}` : "/games";
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
              color: color ? "#111" : "#005d2c",
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
