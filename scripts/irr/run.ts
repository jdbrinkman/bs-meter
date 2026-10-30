/**
 * Reliability test harness. Never calls scoreGameV2 and never writes to the scores table:
 * every run is a JSON file under tmp/irr/runs/<phase>/. Resumable (existing run files are skipped).
 *
 *   npx tsx scripts/irr/run.ts snapshot [--games a,b] [--force]
 *   npx tsx scripts/irr/run.ts e2e --phase pilot --games a,b --configs A,B --runs 2 [--variant base|shuffle|dupes|reworded|masked]
 *   npx tsx scripts/irr/run.ts frozen --phase phase2 --from phase1 --configs A,B --reruns 3
 *   npx tsx scripts/irr/run.ts status
 */
import fs from "node:fs";
import path from "node:path";
import {
  COST_CAP_USD, CONFIGS, CONFIRM_GAMES, DEV_GAMES, RUN_DIR, SNAP_DIR, loadEnv, loadSnapshot, pool,
  readJson, recordSpend, spentUsd, takeSnapshot, writeJson, type NamedConfig, type Snapshot,
} from "./common";
import { classifyObservations, extractObservations, rateFromObservations, VERSIONS } from "@/lib/ai/v2/analyze";
import { StageError, type Attempt } from "@/lib/ai/v2/run";
import { costUsd } from "@/lib/ai/gemini";
import type { Coverage, Observation } from "@/lib/ai/v2/schema";
import type { AnalysisV2 } from "@/lib/ai/v2/schema";
import type { PromptOptions } from "@/lib/ai/v2/prompt";
import { computeBsIndex, computeJuiceIndex, deriveVerdictV2, isProvisional, ratingValue, type Ratings } from "@/lib/scoring/v2";
import { rng } from "./stats";
import type { ReviewSource } from "@/lib/types";

export type Variant = "base" | "shuffle" | "dupes" | "reworded" | "masked";

export type RunRecord = {
  phase: string;
  kind: "e2e" | "rate" | "classify";
  slug: string;
  config: { name: string; model: string; thinkingLevel: string; temperature: string; maxOutputTokens: number };
  variant: Variant;
  run: number;
  versions: typeof VERSIONS;
  evidenceHash: string;
  startedAt: string;
  ok: boolean;
  error?: string;
  /** Attempts per stage, including failed ones (truncated / invalid / api_error). */
  attempts: { extract: Attempt[]; rate: Attempt[]; classify: Attempt[] };
  observations?: Observation[];
  /** Stage-1 coverage list (v3.1 and later). */
  coverage?: Coverage;
  analysis?: AnalysisV2;
  classifications?: { id: string; measure: string }[];
  indexes?: { juice: number | null; bs: number | null; verdict: string; provisional: boolean };
  costUsd: number;
  modelsReturned: string[];
};

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const attemptCost = (model: string, attempts: Attempt[]) =>
  attempts.reduce((n, a) => n + costUsd(model, a.inputTokens, a.outputTokens + a.thinkingTokens), 0);

function variantSources(snap: Snapshot, variant: Variant, run: number): { sources: ReviewSource[]; opts: PromptOptions } {
  const sources = [...snap.sources];
  const opts: PromptOptions = {};
  if (variant === "shuffle") {
    const r = rng(1000 + run);
    for (let i = sources.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [sources[i], sources[j]] = [sources[j], sources[i]];
    }
  } else if (variant === "dupes") {
    // Re-insert one video transcript and one written review verbatim (with new ids, so de-duplication by id cannot hide them).
    const firstOf = (t: string) => sources.find((s) => s.source_type === t);
    for (const t of ["youtube", "article"]) {
      const s = firstOf(t);
      if (s) sources.push({ ...s, id: `${s.id}-dup`, video_id: null });
    }
  } else if (variant === "reworded") opts.variant = "reworded";
  else if (variant === "masked") opts.maskTitle = true;
  return { sources, opts };
}

function finish(rec: RunRecord, snap: Snapshot) {
  if (rec.analysis) {
    const ratings = rec.analysis.ratings as Ratings;
    const juice = computeJuiceIndex(ratings, snap.genreKey);
    const bs = computeBsIndex(ratings);
    rec.indexes = {
      juice, bs, provisional: isProvisional(ratings),
      verdict: deriveVerdictV2({
        juice, bs, broken: ratingValue(ratings.broken),
        priceUsd: snap.game.current_price_usd ?? snap.game.price_usd, releaseDate: snap.game.release_date,
      }),
    };
  }
  const all = [...rec.attempts.extract, ...rec.attempts.rate, ...rec.attempts.classify];
  rec.costUsd = attemptCost(rec.config.model, all);
  rec.modelsReturned = [...new Set(all.map((a) => a.modelReturned).filter((m): m is string => !!m))];
}

const newRecord = (phase: string, kind: RunRecord["kind"], snap: Snapshot, cfg: NamedConfig, variant: Variant, run: number): RunRecord => ({
  phase, kind, slug: snap.slug,
  config: { name: cfg.name, model: cfg.model, thinkingLevel: cfg.thinkingLevel, temperature: "default", maxOutputTokens: cfg.maxOutputTokens },
  variant, run, versions: VERSIONS, evidenceHash: snap.hash, startedAt: new Date().toISOString(), ok: false,
  attempts: { extract: [], rate: [], classify: [] }, costUsd: 0, modelsReturned: [],
});

function runFile(phase: string, slug: string, cfg: string, variant: string, run: number, kind: string) {
  return path.join(RUN_DIR, phase, `${slug}__${cfg}__${kind === "e2e" ? "" : kind + "__"}${variant}__r${run}.json`);
}

/** The meter stops new calls once spend reaches the cap. */
function overBudget(): boolean {
  return spentUsd() >= COST_CAP_USD;
}

async function runE2E(phase: string, slug: string, cfg: NamedConfig, variant: Variant, run: number) {
  const file = runFile(phase, slug, cfg.name, variant, run, "e2e");
  if (fs.existsSync(file)) return;
  if (overBudget()) { console.log(`STOP: cost cap $${COST_CAP_USD} reached; skipping ${path.basename(file)}`); return; }
  const snap = loadSnapshot(slug);
  const rec = newRecord(phase, "e2e", snap, cfg, variant, run);
  const { sources, opts } = variantSources(snap, variant, run);
  try {
    const ext = await extractObservations(snap.game, sources, snap.genreKey, snap.critics, cfg, opts, 2);
    rec.attempts.extract = ext.attempts;
    rec.observations = ext.value.observations;
    rec.coverage = ext.value.coverage;
    const rated = await rateFromObservations(snap.game, snap.genreKey, ext.value.observations, cfg, opts, 2, ext.value.coverage);
    rec.attempts.rate = rated.attempts;
    rec.analysis = rated.value;
    rec.ok = true;
  } catch (e) {
    rec.error = e instanceof Error ? e.message : String(e);
    if (e instanceof StageError) {
      // The failed stage's attempts are on the error; attribute them to the stage that had none yet.
      if (!rec.attempts.extract.length) rec.attempts.extract = e.attempts;
      else rec.attempts.rate = e.attempts;
    }
  }
  finish(rec, snap);
  writeJson(file, rec);
  recordSpend({ phase, label: path.basename(file), costUsd: rec.costUsd });
  const idx = rec.indexes;
  console.log(
    `${rec.ok ? "ok  " : "FAIL"} ${phase} ${slug} ${cfg.name} ${variant} r${run}  $${rec.costUsd.toFixed(3)}` +
      (idx ? `  juice ${idx.juice} bs ${idx.bs} ${idx.verdict}` : `  ${rec.error}`) + `  (spent $${spentUsd().toFixed(2)})`
  );
}

/** Phase 2: rerun one stage on a frozen intermediate result (the run-1 output of `from`). */
async function runFrozen(phase: string, from: string, slug: string, cfg: NamedConfig, rerun: number) {
  const src = runFile(from, slug, cfg.name, "base", 1, "e2e");
  if (!fs.existsSync(src)) { console.log(`skip ${slug} ${cfg.name}: no ${path.basename(src)}`); return; }
  const base = readJson<RunRecord>(src);
  if (!base.ok || !base.observations) { console.log(`skip ${slug} ${cfg.name}: source run failed`); return; }
  const snap = loadSnapshot(slug);
  for (const kind of ["rate", "classify"] as const) {
    const file = runFile(phase, slug, cfg.name, "base", rerun, kind);
    if (fs.existsSync(file)) continue;
    if (overBudget()) { console.log("STOP: cost cap reached"); return; }
    const rec = newRecord(phase, kind, snap, cfg, "base", rerun);
    try {
      if (kind === "rate") {
        const r = await rateFromObservations(snap.game, snap.genreKey, base.observations, cfg, {}, 2);
        rec.attempts.rate = r.attempts;
        rec.analysis = r.value;
      } else {
        const r = await classifyObservations(base.observations, cfg, 2);
        rec.attempts.classify = r.attempts;
        rec.classifications = r.value.classifications;
      }
      rec.observations = base.observations;
      rec.ok = true;
    } catch (e) {
      rec.error = e instanceof Error ? e.message : String(e);
      if (e instanceof StageError) rec.attempts[kind] = e.attempts;
    }
    finish(rec, snap);
    writeJson(file, rec);
    recordSpend({ phase, label: path.basename(file), costUsd: rec.costUsd });
    console.log(`${rec.ok ? "ok  " : "FAIL"} ${phase} ${kind} ${slug} ${cfg.name} r${rerun}  $${rec.costUsd.toFixed(3)}  (spent $${spentUsd().toFixed(2)})`);
  }
}

async function main() {
  loadEnv();
  const cmd = process.argv[2];
  const games = (arg("games") ?? DEV_GAMES.join(",")).split(",").filter(Boolean);
  const cfgs = (arg("configs") ?? "A,B").split(",").map((c) => {
    if (!CONFIGS[c]) throw new Error(`Unknown config ${c}`);
    return CONFIGS[c];
  });
  const conc = Number(arg("concurrency", "3"));

  if (cmd === "snapshot") {
    const list = arg("games") ? games : [...DEV_GAMES, ...CONFIRM_GAMES];
    for (const slug of list) {
      const s = await takeSnapshot(slug, flag("force"));
      console.log(`${slug.padEnd(48)} hash ${s.hash}  sources ${String(s.sources.length).padStart(2)}  chars ${String(s.chars).padStart(7)}  ~tokens ${Math.round(s.chars / 4)}  genre ${s.genreKey}`);
    }
    fs.mkdirSync(SNAP_DIR, { recursive: true });
  } else if (cmd === "e2e") {
    const phase = arg("phase");
    if (!phase) throw new Error("--phase required");
    const variant = (arg("variant") ?? "base") as Variant;
    const runs = Number(arg("runs", "1"));
    const first = Number(arg("first", "1"));
    const jobs: { slug: string; cfg: NamedConfig; run: number }[] = [];
    for (let r = first; r < first + runs; r++) for (const slug of games) for (const cfg of cfgs) jobs.push({ slug, cfg, run: r });
    await pool(jobs, conc, (j) => runE2E(phase, j.slug, j.cfg, variant, j.run));
  } else if (cmd === "frozen") {
    const phase = arg("phase", "phase2")!;
    const from = arg("from", "phase1")!;
    const reruns = Number(arg("reruns", "3"));
    const jobs: { slug: string; cfg: NamedConfig; rerun: number }[] = [];
    for (let r = 1; r <= reruns; r++) for (const slug of games) for (const cfg of cfgs) jobs.push({ slug, cfg, rerun: r });
    await pool(jobs, conc, (j) => runFrozen(phase, from, j.slug, j.cfg, j.rerun));
  } else if (cmd === "status") {
    console.log(`spent $${spentUsd().toFixed(3)} of cap $${COST_CAP_USD}`);
  } else {
    console.log("commands: snapshot | e2e | frozen | status");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
