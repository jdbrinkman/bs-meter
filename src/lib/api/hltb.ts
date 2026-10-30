// HowLongToBeat time-to-beat, via the maintained `howlongtobeat-ts` client.
//
// Access: HowLongToBeat (Ziff Davis) gave BS Meter permission to use its data. Keep the written
// confirmation on file (see docs/data-source-permissions.md). Be a good guest: one lookup per game
// at ingest time, results cached for HLTB_REFRESH_DAYS, polite spacing, and an honest User-Agent.
import { HowLongToBeatService, toHours } from "howlongtobeat-ts";

export const HLTB_USER_AGENT = "BSMeter/1.0 (game time-respect scorer; permission granted by HowLongToBeat)";
export const HLTB_REFRESH_DAYS = 30;

export type HltbMatch = {
  id: number;
  name: string;
  releaseYear: number | null;
  mainHours: number | null;
  extraHours: number | null;
  completionistHours: number | null;
};

type Entry = {
  id: number;
  name: string;
  similarity?: number;
  releaseYear?: number;
  mainTime?: number;
  mainExtraTime?: number;
  completionistTime?: number;
};

// Words that name an edition, not a different game
const EDITION = new Set(["remake", "remastered", "remaster", "definitive", "edition", "enhanced", "complete", "goty", "the"]);

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t && !EDITION.has(t))
    .join(" ");
}

/**
 * Chooses the HLTB entry that is this exact game. Requires the same title (ignoring edition words)
 * and, when we know our release year, a release year within one year. Returns null instead of guessing.
 */
export function pickHltbEntry(title: string, releaseYear: number | null, entries: Entry[]): Entry | null {
  const wanted = norm(title);
  const candidates = entries.filter((e) => {
    if (norm(e.name) !== wanted) return false;
    if (releaseYear != null && e.releaseYear != null && Math.abs(e.releaseYear - releaseYear) > 1) return false;
    return true;
  });
  return [...candidates].sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))[0] ?? null;
}

const hours = (seconds?: number): number | null => (seconds ? toHours(seconds) ?? null : null);

export async function lookupHltb(title: string, releaseYear: number | null): Promise<{ ok: true; match: HltbMatch | null } | { ok: false; reason: string }> {
  const service = new HowLongToBeatService({ userAgents: [HLTB_USER_AGENT], timeout: 20000, retries: 1 });
  const res = await service.search(title);
  if (!res.success) return { ok: false, reason: `${res.kind ?? "error"}${res.status ? " " + res.status : ""}: ${String(res.error).slice(0, 120)}` };
  const entry = pickHltbEntry(title, releaseYear, res.data as unknown as Entry[]);
  if (!entry) return { ok: true, match: null };
  return {
    ok: true,
    match: {
      id: entry.id,
      name: entry.name,
      releaseYear: entry.releaseYear ?? null,
      mainHours: hours(entry.mainTime),
      extraHours: hours(entry.mainExtraTime),
      completionistHours: hours(entry.completionistTime),
    },
  };
}
