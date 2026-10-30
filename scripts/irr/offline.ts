/**
 * Free (no AI call) analyses on saved runs: what one rating step does to the indexes, whether a median of
 * several runs would calm the index noise, and which items cause the applicability disagreement.
 *   npx tsx scripts/irr/offline.ts --phase phase1 --config A
 */
import fs from "node:fs";
import path from "node:path";
import { OUT, loadSnapshot, writeJson } from "./common";
import { itemsFor, loadRuns, medianRatings } from "./analyze";
import { mean, modal, sd, median } from "./stats";
import { JUICE_WEIGHTS, MEASURES, SQUEEZE, VERDICTS, computeBsIndex, computeJuiceIndex, deriveVerdictV2, displayIndex, ratingValue, BS_TOP_WEIGHTS } from "@/lib/scoring/v2";
import type { RunRecord } from "./run";

const arg = (n: string, d: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const phase = arg("phase", "phase1");
const cfg = arg("config", "A");
const recs = loadRuns(phase).filter((r) => r.config.name === cfg && r.kind === "e2e" && r.variant === "base" && r.ok);
const md: string[] = [`## Offline analyses (${phase}, config ${cfg})`, ""];

// 1. What does one rating step do to an index?
md.push("### What one rating step is worth", "",
  "Because ratings are 1-5 integers, one step on one measure moves an index by a fixed amount. This sets a floor on index noise: a single one-step disagreement between runs already exceeds the pre-registered SD target of 3.", "",
  `BS index (worst three at ${BS_TOP_WEIGHTS.join("/")}): one step on the worst measure = ${(BS_TOP_WEIGHTS[0] * 25).toFixed(1)} points, second = ${(BS_TOP_WEIGHTS[1] * 25).toFixed(1)}, third = ${(BS_TOP_WEIGHTS[2] * 25).toFixed(1)}.`, "",
  "Juice index, one step on each measure (all six rated), by profile:", "", `| Profile | ${["story", "gameplay", "world", "presentation", "challenge", "staying"].join(" | ")} |`, "|---|---|---|---|---|---|---|");
for (const [k, w] of Object.entries(JUICE_WEIGHTS)) {
  const t = Object.values(w).reduce((a, b) => a + b, 0);
  md.push(`| ${k} | ${Object.values(w).map((x) => ((x / t) * 25).toFixed(1)).join(" | ")} |`);
}

// 2. Median of k runs vs single runs (all k-subsets of the available runs)
const bySlug = new Map<string, RunRecord[]>();
for (const r of recs) bySlug.set(r.slug, [...(bySlug.get(r.slug) ?? []), r]);
const combos = <T,>(xs: T[], k: number): T[][] => (k === 0 ? [[]] : xs.flatMap((x, i) => combos(xs.slice(i + 1), k - 1).map((c) => [x, ...c])));
md.push("", "### Would a median of 3 runs calm the indexes?", "",
  "For each game, every 3-run subset of the 5 saved runs is collapsed to median ratings and scored. Subsets overlap, so their spread understates real independent variation; treat the improvement as an upper bound.", "",
  "| Game | Single-run SD (Juice / BS) | Median-of-3 SD (Juice / BS) | Verdicts, single | Verdicts, median-of-3 |", "|---|---|---|---|---|");
const sdSingle: number[] = [], sdMed: number[] = [];
for (const [slug, rs] of bySlug) {
  const snap = loadSnapshot(slug);
  const price = snap.game.current_price_usd ?? snap.game.price_usd;
  const idx = (ratings: ReturnType<typeof medianRatings> extends Map<string, infer R> ? R : never) => ({
    j: computeJuiceIndex(ratings, snap.genreKey), b: computeBsIndex(ratings),
    v: deriveVerdictV2({ juice: computeJuiceIndex(ratings, snap.genreKey), bs: computeBsIndex(ratings), broken: ratingValue(ratings.broken), priceUsd: price, releaseDate: snap.game.release_date }),
  });
  const med = combos(rs, 3).map((c) => idx(medianRatings(c).get(slug)!));
  const sJ = sd(rs.map((r) => r.indexes!.juice!)), sB = sd(rs.map((r) => r.indexes!.bs!));
  const mJ = sd(med.map((m) => m.j!)), mB = sd(med.map((m) => m.b!));
  sdSingle.push(sJ, sB); sdMed.push(mJ, mB);
  const vs = (xs: string[]) => { const m = modal(xs); return `${VERDICTS[m.value as keyof typeof VERDICTS].label} ${Math.round(m.share * 100)}%`; };
  md.push(`| ${slug} | ${sJ.toFixed(1)} / ${sB.toFixed(1)} | ${mJ.toFixed(1)} / ${mB.toFixed(1)} | ${vs(rs.map((r) => r.indexes!.verdict))} | ${vs(med.map((m) => m.v))} |`);
}
md.push("", `Median SD across games and both indexes: single run ${median(sdSingle).toFixed(1)}, median of 3 ${median(sdMed).toFixed(1)}.`);

// 3. Rounded display
const rounded = [...bySlug].flatMap(([, rs]) => [sd(rs.map((r) => displayIndex(r.indexes!.juice)!)), sd(rs.map((r) => displayIndex(r.indexes!.bs)!))]);
md.push("", `With indexes shown to the nearest 5 (as the site now does), median SD across runs is ${median(rounded).toFixed(1)}; the verdict, which is what users see first, is unchanged by rounding.`);

// 4. Which items cause the applicability disagreement
const items = itemsFor(recs).filter((i) => new Set(i.cats).size > 1);
md.push("", "### Items where runs disagree about whether a measure is rated, not applicable, or not discussed", "",
  `${items.length} of ${itemsFor(recs).length} items. By measure:`, "");
const byMeasure = new Map<string, number>();
for (const i of items) byMeasure.set(i.measure, (byMeasure.get(i.measure) ?? 0) + 1);
md.push([...byMeasure].sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} ${n}`).join(", "), "", "| Game | Measure | Runs (rating, N/A, or n/d) |", "|---|---|---|");
for (const i of items) md.push(`| ${i.slug} | ${i.measure} | ${i.vals.map((v, k) => v ?? i.cats[k]).join(", ")} |`);

// 5. Per-measure disagreement size
md.push("", "### How far apart are runs when they disagree? (items rated at least twice)", "");
const comp = itemsFor(recs).filter((i) => i.vals.filter((v) => v != null).length >= 2);
const ranges = comp.map((i) => { const v = i.vals.filter((x): x is number => x != null); return Math.max(...v) - Math.min(...v); });
md.push(`Range 0: ${ranges.filter((r) => r === 0).length}, range 1: ${ranges.filter((r) => r === 1).length}, range 2: ${ranges.filter((r) => r === 2).length}, range 3+: ${ranges.filter((r) => r >= 3).length} (of ${ranges.length} items). Mean rating by measure for reference: ${MEASURES.map((m) => `${m.key} ${mean(comp.filter((i) => i.measure === m.key).flatMap((i) => i.vals.filter((x): x is number => x != null))).toFixed(1)}`).join(", ")}.`);
void SQUEEZE; void path;
fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
fs.writeFileSync(path.join(OUT, "reports", `offline-${cfg}.md`), md.join("\n") + "\n");
writeJson(path.join(OUT, "reports", `offline-${cfg}.json`), { sdSingle, sdMed });
console.log(md.join("\n"));
