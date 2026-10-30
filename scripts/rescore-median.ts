/**
 * Second pass for borderline games: two more runs on top of the re-score's run, then the middle rating per
 * measure decides the numbers and the verdict.
 *
 *   npx tsx scripts/rescore-median.ts --games a,b,c [--concurrency 3] [--cap 1.5]
 *
 * Rules:
 *  - Status per measure (rated / not applicable / not discussed): the one at least two runs agree on, else the first run's.
 *  - Rating per measure: the middle of three; with two rated values, the first run's value if it was rated, else the lower.
 *  - The measure's reason, source and issue ids come from a run that gave that rating.
 *  - Issues, coverage, headline and confidence come from the one run closest to the middle ratings.
 *  - Writes only the scores row (never analysis_status), so nothing flickers on the public site.
 *  - Every run is saved under tmp/irr/runs/rescore-median/, and the rows are backed up first.
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv, pool, readJson, recordSpend, writeJson } from "./irr/common";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeGameV2 } from "@/lib/ai/v2/analyze";
import { resolveGenreKey } from "@/config/game-profiles";
import { dedupeSources, flagQuotes } from "@/lib/pipeline/evidence";
import { costUsd, SCORING_CONFIG } from "@/lib/ai/gemini";
import { computeBsIndex, computeJuiceIndex, deriveVerdictV2, isProvisional, MEASURES, ratingValue, type Ratings } from "@/lib/scoring/v2";
import type { AnalysisV2 } from "@/lib/ai/v2/schema";
import type { Game, ReviewSource } from "@/lib/types";

const OUT = path.join(process.cwd(), "tmp", "irr");
const RUN_DIR = path.join(OUT, "runs", "rescore-median");

type Rating = AnalysisV2["ratings"][string];
type RunData = {
  n: number;
  ratings: Record<string, Rating>;
  headline: string;
  rough_launch: boolean;
  confidence: number;
  issues: unknown[];
  coverage: unknown;
  meta: Record<string, unknown>;
  tokens: { input: number; output: number; thinking: number; attempts: number };
  model: string;
  juice: number | null;
  bs: number | null;
  verdict: string;
};

type Meta = { coverage?: unknown; input_tokens?: number; output_tokens?: number; thinking_tokens?: number; attempts?: number; [k: string]: unknown };
type ScoreRow = {
  game_id: string; ratings: Record<string, Rating>; headline: string; rough_launch: boolean; confidence: string | number;
  issues: unknown[] | null; run_meta: Meta | null; model_version: string; juice_index: number | null; bs_index: number | null; verdict_v2: string;
};

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
}

const priceOf = (g: Game) => g.current_price_usd ?? g.price_usd;

function composite(runs: RunData[]): Record<string, Rating> {
  const out: Record<string, Rating> = {};
  for (const m of MEASURES) {
    const rs = runs.map((r) => r.ratings[m.key]);
    const counts = new Map<string, number>();
    for (const x of rs) counts.set(x.status, (counts.get(x.status) ?? 0) + 1);
    let status = rs[0].status;
    for (const [st, c] of counts) if (c >= 2) status = st as Rating["status"];
    if (status !== "rated") {
      out[m.key] = rs.find((x) => x.status === status)!;
      continue;
    }
    const vals = rs.filter((x) => x.status === "rated").map((x) => x.rating as number);
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = sorted.length >= 3 ? sorted[1] : sorted.length === 2 ? (rs[0].status === "rated" ? (rs[0].rating as number) : sorted[0]) : sorted[0];
    out[m.key] = rs.find((x) => x.status === "rated" && x.rating === mid)!;
  }
  return out;
}

function distance(a: Record<string, Rating>, b: Record<string, Rating>): number {
  let d = 0;
  for (const m of MEASURES) {
    const x = a[m.key], y = b[m.key];
    if (x.status !== y.status) d += 2;
    else if (x.status === "rated") d += Math.abs((x.rating as number) - (y.rating as number));
  }
  return d;
}

async function main() {
  loadEnv();
  const db = createAdminClient();
  const slugs = (arg("games") ?? "").split(",").filter(Boolean);
  if (!slugs.length) throw new Error("--games is required");
  const conc = Number(arg("concurrency", "3"));
  const cap = Number(arg("cap", "1.5"));

  const { data: games } = await db.from("games").select("*").in("slug", slugs);
  const byslug = new Map((games ?? []).map((g) => [g.slug as string, g as Game]));
  const { data: rows } = await db.from("scores").select("*").in("game_id", (games ?? []).map((g) => g.id));
  const backupFile = path.join(OUT, "backup", `scores-pre-median-${new Date().toISOString().slice(0, 10)}.json`);
  if (!fs.existsSync(backupFile)) writeJson(backupFile, { takenAt: new Date().toISOString(), scores: rows });
  const rowOf = new Map((rows ?? []).map((r) => [r.game_id as string, r as ScoreRow]));

  // Run 1 is the stored row; runs 2 and 3 are new.
  const extra: { slug: string; n: 2 | 3 }[] = slugs.flatMap((slug) => ([2, 3] as const).map((n) => ({ slug, n })));
  const results = new Map<string, RunData>();
  let spent = 0;
  const failed = new Set<string>();

  await pool(extra, conc, async ({ slug, n }) => {
    const file = path.join(RUN_DIR, `${slug}__r${n}.json`);
    if (fs.existsSync(file)) { results.set(`${slug}:${n}`, readJson<RunData>(file)); return; }
    if (spent >= cap) { console.log(`STOP: cap $${cap} reached; skipping ${slug} r${n}`); failed.add(slug); return; }
    const g = byslug.get(slug);
    if (!g) { failed.add(slug); return; }
    try {
      const [{ data: sources }, { data: critics }] = await Promise.all([
        db.from("review_sources").select("*").eq("game_id", g.id),
        db.from("critic_reviews").select("outlet, snippet").eq("game_id", g.id).order("published_at", { ascending: true }).limit(40),
      ]);
      const used = dedupeSources((sources || []) as ReviewSource[]);
      const genreKey = resolveGenreKey(g);
      const r = await analyzeGameV2(g, used, genreKey, critics || []);
      const attempts = [...r.extract, ...r.rate];
      const ok = attempts.filter((a) => a.kind === "ok");
      const model = ok[ok.length - 1]?.modelReturned ?? SCORING_CONFIG.model;
      const sum = (f: (a: (typeof attempts)[number]) => number) => attempts.reduce((x, a) => x + f(a), 0);
      const ratings = r.analysis.ratings as Ratings;
      const juice = computeJuiceIndex(ratings, genreKey);
      const bs = computeBsIndex(ratings);
      const data: RunData = {
        n, ratings: r.analysis.ratings, headline: r.analysis.headline, rough_launch: r.analysis.rough_launch, confidence: r.analysis.confidence,
        issues: flagQuotes(r.observations, used, critics || []), coverage: r.coverage, meta: {},
        tokens: { input: sum((a) => a.inputTokens), output: sum((a) => a.outputTokens), thinking: sum((a) => a.thinkingTokens), attempts: attempts.length },
        model, juice, bs,
        verdict: deriveVerdictV2({ juice, bs, broken: ratingValue(ratings.broken), priceUsd: priceOf(g), releaseDate: g.release_date }),
      };
      const cost = costUsd(model, data.tokens.input, data.tokens.output + data.tokens.thinking);
      spent += cost;
      recordSpend({ phase: "rescore-median", label: `${slug} r${n}`, costUsd: cost });
      writeJson(file, data);
      results.set(`${slug}:${n}`, data);
      console.log(`ok   ${slug} r${n}  juice ${juice} bs ${bs} ${data.verdict}  $${cost.toFixed(3)}  (spent $${spent.toFixed(2)})`);
    } catch (e) {
      failed.add(slug);
      console.log(`FAIL ${slug} r${n}  ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`);
    }
  });

  for (const slug of slugs) {
    const g = byslug.get(slug)!;
    const row = rowOf.get(g.id);
    const r2 = results.get(`${slug}:2`), r3 = results.get(`${slug}:3`);
    if (!row || !r2 || !r3 || failed.has(slug)) { console.log(`SKIP ${slug}: needs all three runs, left as a single run`); continue; }
    const meta1: Meta = row.run_meta ?? {};
    const run1: RunData = {
      n: 1, ratings: row.ratings, headline: row.headline, rough_launch: row.rough_launch, confidence: Number(row.confidence),
      issues: row.issues ?? [], coverage: meta1.coverage ?? null, meta: meta1,
      tokens: { input: meta1.input_tokens ?? 0, output: meta1.output_tokens ?? 0, thinking: meta1.thinking_tokens ?? 0, attempts: meta1.attempts ?? 0 },
      model: row.model_version, juice: row.juice_index, bs: row.bs_index, verdict: row.verdict_v2,
    };
    const runs = [run1, r2, r3];
    const ratings = composite(runs);
    const closest = [...runs].sort((a, b) => distance(a.ratings, ratings) - distance(b.ratings, ratings) || a.n - b.n)[0];
    const genreKey = resolveGenreKey(g);
    const juice = computeJuiceIndex(ratings as Ratings, genreKey);
    const bs = computeBsIndex(ratings as Ratings);
    const verdict = deriveVerdictV2({ juice, bs, broken: ratingValue((ratings as Ratings).broken), priceUsd: priceOf(g), releaseDate: g.release_date });
    const sumTok = (k: "input" | "output" | "thinking" | "attempts") => runs.reduce((x, r) => x + r.tokens[k], 0);
    const { error } = await db
      .from("scores")
      .update({
        ratings, juice_index: juice, bs_index: bs, verdict_v2: verdict, headline: closest.headline, rough_launch: closest.rough_launch,
        confidence: closest.confidence, issues: closest.issues, provisional: isProvisional(ratings as Ratings),
        run_meta: {
          ...meta1, coverage: closest.coverage, median_of: 3, record_from_run: closest.n,
          runs: runs.map((r) => ({ n: r.n, juice: r.juice, bs: r.bs, verdict: r.verdict })),
          input_tokens: sumTok("input"), output_tokens: sumTok("output"), thinking_tokens: sumTok("thinking"), attempts: sumTok("attempts"),
          unmatched_quotes: (closest.issues as { quote_found: boolean | null }[]).filter((i) => i.quote_found === false).length,
        },
        scored_at: new Date().toISOString(),
      })
      .eq("game_id", g.id);
    if (error) { console.log(`FAIL write ${slug}: ${error.message}`); continue; }
    console.log(
      `${slug.padEnd(30)} runs ${runs.map((r) => `${r.juice}/${r.bs} ${r.verdict}`).join(" | ")}  => median ${juice}/${bs} ${verdict}${verdict === run1.verdict ? "" : "  (CHANGED from " + run1.verdict + ")"}`
    );
  }
  console.log(`done: spent $${spent.toFixed(2)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
