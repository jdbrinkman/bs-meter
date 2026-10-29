import { GameGrid } from "./GameGrid";
import { VERDICTS } from "@/lib/scoring/v2";
import { GENRE_LABELS, VERDICT_ORDER, filterAndSort, loadListedGames } from "@/lib/listing";

/** Filter chips plus the game grid. Shared by the home page and /games so they can never disagree. */
export async function GameBrowser({
  basePath,
  verdict,
  genre,
  showCount = false,
}: {
  basePath: string;
  verdict?: string;
  genre?: string;
  showCount?: boolean;
}) {
  const all = await loadListedGames();
  const availableGenres = Array.from(new Set(all.map((g) => g.scores?.genre_rule_applied).filter((g): g is string => !!g))).sort((a, b) =>
    (GENRE_LABELS[a] || a).localeCompare(GENRE_LABELS[b] || b)
  );
  const games = filterAndSort(all, { verdict, genre });
  const url = (v?: string, g?: string) => {
    const p = new URLSearchParams();
    if (v) p.set("verdict", v);
    if (g) p.set("genre", g);
    const qs = p.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <>
      {showCount && <p className="mb-8 font-label text-sm text-on-surface-variant">{games.length} games rated</p>}

      <div className="mb-4">
        <p className="mb-2 font-label text-[10px] font-semibold uppercase tracking-widest text-outline">Verdict</p>
        <div className="flex flex-wrap gap-2">
          <FilterChip href={url(undefined, genre)} label="All" active={!verdict} />
          {VERDICT_ORDER.map((v) => (
            <FilterChip key={v} href={url(v, genre)} label={VERDICTS[v].label} color={VERDICTS[v].color} active={verdict === v} />
          ))}
        </div>
      </div>

      {availableGenres.length > 0 && (
        <div className="mb-10">
          <p className="mb-2 font-label text-[10px] font-semibold uppercase tracking-widest text-outline">Genre</p>
          <div className="flex flex-wrap gap-2">
            <FilterChip href={url(verdict, undefined)} label="All" active={!genre} />
            {availableGenres.map((g) => (
              <FilterChip key={g} href={url(verdict, g)} label={GENRE_LABELS[g] || g} active={genre === g} />
            ))}
          </div>
        </div>
      )}

      <GameGrid games={games} />
    </>
  );
}

function FilterChip({ href, label, color, active }: { href: string; label: string; color?: string; active: boolean }) {
  return (
    <a
      href={href}
      className="rounded-full border px-4 py-1.5 font-label text-xs font-medium transition-all"
      style={
        active
          ? { backgroundColor: color || "#3fff8b", borderColor: color || "#3fff8b", color: color ? "#111" : "#005d2c" }
          : { borderColor: "#494847", color: "#adaaaa" }
      }
    >
      {label}
    </a>
  );
}
