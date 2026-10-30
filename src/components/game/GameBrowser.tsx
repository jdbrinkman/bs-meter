import { GameGrid } from "./GameGrid";
import { FilterSelects, type SelectSpec } from "./FilterSelects";
import { VERDICTS } from "@/lib/scoring/v2";
import { GENRE_GROUPS, PLATFORM_GROUPS } from "@/config/browse-groups";
import {
  SORTS,
  VERDICT_ORDER,
  applyFilters,
  buildUrl,
  inGenre,
  inPlatform,
  loadListedGames,
  parseBrowseState,
  sortGames,
  type BrowseState,
} from "@/lib/listing";

type Params = { [key: string]: string | string[] | undefined };

/** Verdict bar, dropdowns, applied-filter row and the grid. Shared by the home page and /games so they can never disagree. */
export async function GameBrowser({ basePath, params, showCount = false }: { basePath: string; params: Params; showCount?: boolean }) {
  const state = parseBrowseState(params);
  const all = await loadListedGames();
  const games = sortGames(applyFilters(all, state), state.sort);
  const url = (patch: Partial<BrowseState>) => buildUrl(basePath, { ...state, ...patch });

  // Each control counts its own options against the other filters, so a choice never leads to an empty page by surprise.
  const forVerdict = applyFilters(all, state, "verdict");
  const forGenre = applyFilters(all, state, "genre");
  const forPlatform = applyFilters(all, state, "platform");

  const optionList = (
    allLabel: string,
    pool: typeof all,
    groups: { key: string; label: string }[],
    member: (g: (typeof all)[number], key: string) => boolean,
    key: "genre" | "platform"
  ): SelectSpec["options"] => [
    { value: "", label: `${allLabel} (${pool.length})`, href: url({ [key]: undefined }) },
    ...groups
      .filter((g) => all.some((x) => member(x, g.key)))
      .map((g) => {
        const n = pool.filter((x) => member(x, g.key)).length;
        return { value: g.key, label: `${g.label} (${n})`, href: url({ [key]: g.key }), disabled: n === 0 && state[key] !== g.key };
      }),
  ];

  const selects: SelectSpec[] = [
    { id: "platform", label: "Platform", value: state.platform ?? "", options: optionList("All platforms", forPlatform, PLATFORM_GROUPS, inPlatform, "platform") },
    { id: "genre", label: "Genre", value: state.genre ?? "", options: optionList("All genres", forGenre, GENRE_GROUPS, inGenre, "genre") },
    {
      id: "sort",
      label: "Sort by",
      value: state.sort,
      options: SORTS.map((s) => ({ value: s.key, label: s.label, href: url({ sort: s.key }) })),
    },
  ];

  const applied: { label: string; href: string }[] = [
    ...(state.platform ? [{ label: PLATFORM_GROUPS.find((g) => g.key === state.platform)!.label, href: url({ platform: undefined }) }] : []),
    ...(state.genre ? [{ label: GENRE_GROUPS.find((g) => g.key === state.genre)!.label, href: url({ genre: undefined }) }] : []),
  ];
  const anyFilter = !!state.verdict || applied.length > 0;

  return (
    <>
      <div className="mb-6">
        <p className="mb-2 font-label text-[10px] font-semibold uppercase tracking-widest text-outline">Verdict</p>
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-3xl border border-outline-variant p-1">
          <VerdictSegment href={url({ verdict: undefined })} label="All" count={forVerdict.length} active={!state.verdict} />
          {VERDICT_ORDER.map((v) => (
            <VerdictSegment
              key={v}
              href={url({ verdict: v })}
              label={VERDICTS[v].label}
              color={VERDICTS[v].color}
              count={forVerdict.filter((g) => g.scores?.verdict_v2 === v).length}
              active={state.verdict === v}
            />
          ))}
        </div>
      </div>

      <FilterSelects selects={selects} />

      <div className="mb-8 mt-5 flex min-h-8 flex-wrap items-center gap-2">
        {showCount && (
          <p className="mr-2 font-label text-sm text-on-surface-variant">
            {games.length} {games.length === 1 ? "game" : "games"}
          </p>
        )}
        {applied.map((a) => (
          <a
            key={a.label}
            href={a.href}
            aria-label={`Remove filter ${a.label}`}
            className="flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-3 py-1 font-label text-xs text-on-surface transition-colors hover:border-on-surface-variant"
          >
            {a.label}
            <span aria-hidden className="text-on-surface-variant">×</span>
          </a>
        ))}
        {anyFilter && (
          <a href={url({ verdict: undefined, genre: undefined, platform: undefined })} className="font-label text-xs text-on-surface-variant underline underline-offset-4 hover:text-on-surface">
            Clear all
          </a>
        )}
      </div>

      <GameGrid games={games} />
    </>
  );
}

function VerdictSegment({ href, label, color, count, active }: { href: string; label: string; color?: string; count: number; active: boolean }) {
  const disabled = count === 0 && !active;
  const inner = (
    <>
      {color && <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: color, opacity: disabled ? 0.4 : 1 }} />}
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </>
  );
  const className = "flex items-center gap-2 rounded-full px-4 py-1.5 font-label text-xs font-medium transition-colors";
  if (disabled) {
    return (
      <span aria-disabled="true" className={`${className} cursor-not-allowed text-outline`}>
        {inner}
      </span>
    );
  }
  return (
    <a
      href={href}
      aria-current={active ? "true" : undefined}
      className={`${className} ${active ? "" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}
      style={active ? { backgroundColor: color || "#3fff8b", color: color ? "#111" : "#005d2c" } : undefined}
    >
      {inner}
    </a>
  );
}
