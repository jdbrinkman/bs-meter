import type { ReviewSource } from "@/lib/types";

/**
 * Drops sources with no text and exact duplicates (same video/review id, or identical text), keeping the first.
 * Repeated material would otherwise gain extra influence on the ratings. The order of the rest is unchanged.
 */
export function dedupeSources(sources: ReviewSource[]): ReviewSource[] {
  const seen = new Set<string>();
  const out: ReviewSource[] = [];
  for (const s of sources) {
    const text = (s.transcript ?? "").trim();
    if (!text) continue;
    const keys = [s.video_id ? `${s.source_type}:${s.video_id}` : null, `text:${text.slice(0, 300)}:${text.length}`].filter(
      (k): k is string => k !== null
    );
    if (keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    out.push(s);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Quote check: stage 1 is told to copy short quotes verbatim. The model sometimes paraphrases them
// instead; this finds those so they can be reviewed. It never changes a score.
// ---------------------------------------------------------------------------

const normQuote = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** One normalised string of everything the extractor was shown (sources and critic excerpts). */
export function evidenceText(sources: ReviewSource[], critics: { snippet: string | null }[] = []): string {
  return normQuote(sources.map((s) => s.transcript ?? "").join(" ") + " " + critics.map((c) => c.snippet ?? "").join(" "));
}

/** True when the quote appears in the evidence, ignoring case and punctuation. A quote joined with "..." is checked piece by piece, and a leading "Outlet:" label is not part of the source text. */
export function quoteAppearsIn(quote: string, evidence: string): boolean {
  const q = normQuote(quote);
  if (!q) return false;
  if (evidence.includes(q)) return true;
  const pieces = quote
    .replace(/^\s*[A-Za-z+ ]{2,20}:\s*['"“]?/, "")
    .split(/\.{3}|…/)
    .map(normQuote)
    .filter((p) => p.split(" ").length >= 4);
  return pieces.length > 0 && pieces.every((p) => evidence.includes(p));
}

/** Adds quote_found to each observation: true or false, or null when there is no quote to check. */
export function flagQuotes<T extends { quote: string }>(
  observations: T[],
  sources: ReviewSource[],
  critics: { snippet: string | null }[] = []
): (T & { quote_found: boolean | null })[] {
  const evidence = evidenceText(sources, critics);
  return observations.map((o) => ({ ...o, quote_found: o.quote ? quoteAppearsIn(o.quote, evidence) : null }));
}
