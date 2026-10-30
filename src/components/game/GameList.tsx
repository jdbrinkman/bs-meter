import Link from "next/link";
import Image from "next/image";
import { VERDICTS, bsColor, displayIndex } from "@/lib/scoring/v2";
import { VerdictIcon } from "./VerdictIcon";
import type { ListedGame, SortKey } from "@/lib/listing";

const JUICE_COLOR = "#22C55E";

const fmtPrice = (p: number | null) => (p == null ? "—" : p === 0 ? "Free" : `$${p.toFixed(2)}`);
const fmtHours = (h: number | null) => (h == null ? "—" : `${Math.round(h)}h`);

// Column header -> the sort it applies. The Game column is not sortable (the Sort-by menu has Newest).
// `dir` is the direction that sort runs: best verdict, lowest BS, shortest and cheapest first; highest Juice first.
const HEADERS: { label: string; sort?: SortKey; dir?: "ascending" | "descending"; width: string }[] = [
  { label: "Game", width: "" },
  { label: "Verdict", sort: "best", dir: "ascending", width: "w-[9.5rem]" },
  { label: "Juice", sort: "juice", dir: "descending", width: "w-24" },
  { label: "BS", sort: "bs", dir: "ascending", width: "w-24" },
  { label: "Time", sort: "shortest", dir: "ascending", width: "w-16" },
  { label: "Price", sort: "price", dir: "ascending", width: "w-20" },
];

function Cover({ game, w, h }: { game: ListedGame; w: number; h: number }) {
  return (
    <span className="relative flex-none overflow-hidden rounded-md bg-surface-container-high" style={{ width: w, height: h }}>
      {game.cover_url ? <Image src={game.cover_url} alt="" fill sizes={`${w}px`} className="object-cover" /> : null}
    </span>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <span className="mt-1 block h-1 w-14 rounded-full bg-surface-container-highest">
      <span className="block h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </span>
  );
}

function VerdictCell({ game, size }: { game: ListedGame; size: number }) {
  const key = game.scores?.verdict_v2;
  const v = key ? VERDICTS[key] : null;
  if (!v || !key) return <span className="font-label text-xs text-on-surface-variant">Not rated yet</span>;
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap font-headline text-xs font-black" style={{ color: v.color }}>
      <VerdictIcon kind={key} size={size} color={v.color} />
      {v.label}
      {game.scores?.provisional && (
        <span title="Thin evidence" aria-label="thin evidence" className="font-body text-on-surface-variant">
          *
        </span>
      )}
    </span>
  );
}

/** One row per game: a table from md up, compact two-line rows on a phone. */
export function GameList({ games, sort, sortHref }: { games: ListedGame[]; sort: SortKey; sortHref: (s: SortKey) => string }) {
  if (games.length === 0) {
    return <div className="py-12 text-center font-label text-on-surface-variant">No games match these filters.</div>;
  }
  const anyThin = games.some((g) => g.scores?.provisional);

  return (
    <div>
      <table className="hidden w-full table-fixed border-collapse text-left md:table">
        <caption className="sr-only">Games with verdict, Juice, BS, time to beat and price</caption>
        <thead>
          <tr className="border-b border-outline-variant/40">
            {HEADERS.map((h) => {
              const active = h.sort === sort;
              return (
                <th
                  key={h.label}
                  scope="col"
                  aria-sort={active ? h.dir : undefined}
                  className={`px-2 py-2 font-label text-[11px] font-medium uppercase tracking-widest ${h.width} ${active ? "text-on-surface" : "text-outline"}`}
                >
                  {h.sort ? (
                    <a href={sortHref(h.sort)} className="hover:text-on-surface">
                      {h.label}
                      {active && <span aria-hidden> {h.dir === "descending" ? "↓" : "↑"}</span>}
                    </a>
                  ) : (
                    h.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {games.map((g) => {
            const juice = displayIndex(g.scores?.juice_index ?? null);
            const bs = displayIndex(g.scores?.bs_index ?? null);
            return (
              <tr key={g.slug} className="relative border-b border-outline-variant/20 transition-colors hover:bg-surface-container">
                <td className="px-2 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <Cover game={g} w={36} h={48} />
                    <div className="min-w-0">
                      <Link href={`/games/${g.slug}`} className="block truncate font-headline text-sm font-bold text-on-surface after:absolute after:inset-0">
                        {g.title}
                      </Link>
                      {g.scores?.headline && (
                        <p title={g.scores.headline} className="truncate font-body text-xs text-on-surface-variant">
                          {g.scores.headline}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2"><VerdictCell game={g} size={14} /></td>
                <td className="px-2 py-2 font-label text-sm tabular-nums text-on-surface">
                  {juice == null ? "—" : (<>~{juice}<Bar value={juice} color={JUICE_COLOR} /></>)}
                </td>
                <td className="px-2 py-2 font-label text-sm tabular-nums" style={{ color: bs == null ? undefined : bsColor(bs) }}>
                  {bs == null ? "—" : (<>~{bs}<Bar value={bs} color={bsColor(bs)} /></>)}
                </td>
                <td className="px-2 py-2 font-label text-sm text-on-surface-variant">{fmtHours(g.main_story_hours)}</td>
                <td className="px-2 py-2 font-label text-sm text-on-surface-variant">{fmtPrice(g.price)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="md:hidden">
        {games.map((g) => {
          const juice = displayIndex(g.scores?.juice_index ?? null);
          const bs = displayIndex(g.scores?.bs_index ?? null);
          return (
            <li key={g.slug} className="relative flex items-center gap-3 border-b border-outline-variant/20 py-3">
              <Cover game={g} w={40} h={54} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/games/${g.slug}`} className="truncate font-headline text-sm font-bold text-on-surface after:absolute after:inset-0">
                    {g.title}
                  </Link>
                  <VerdictCell game={g} size={12} />
                </div>
                <p className="mt-0.5 font-label text-xs tabular-nums text-on-surface-variant">
                  Juice {juice == null ? "—" : `~${juice}`} · BS {bs == null ? "—" : `~${bs}`} · {fmtHours(g.main_story_hours)} · {fmtPrice(g.price)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {anyThin && (
        <p className="mt-3 font-label text-xs text-on-surface-variant">
          * Thin evidence: several measures weren&apos;t covered by the reviews we read. Juice and BS are rounded to the nearest 5.
        </p>
      )}
    </div>
  );
}
