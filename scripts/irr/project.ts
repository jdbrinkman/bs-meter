/** Projects the cost of the remaining phases from measured pilot calls. Usage: npx tsx scripts/irr/project.ts [pilotPhase] */
import fs from "node:fs";
import path from "node:path";
import { CONFIRM_GAMES, DEV_GAMES, ROBUSTNESS_GAMES, RUN_DIR, loadSnapshot, readJson } from "./common";
import { costUsd } from "@/lib/ai/gemini";
import type { RunRecord } from "./run";

const phase = process.argv[2] ?? "pilot";
const dir = path.join(RUN_DIR, phase);
const recs = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => readJson<RunRecord>(path.join(dir, f)));

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const attemptsOf = (r: RunRecord) => [...r.attempts.extract, ...r.attempts.rate, ...r.attempts.classify];

console.log(`== ${phase}: ${recs.length} runs ==`);
for (const cfg of ["A", "B"]) {
  const rs = recs.filter((r) => r.config.name === cfg);
  if (!rs.length) continue;
  const all = rs.flatMap(attemptsOf).filter((a) => a.kind !== "api_error");
  const bad = all.filter((a) => a.kind !== "ok").length;
  console.log(
    `${cfg} ${rs[0].config.model}: runs ok ${rs.filter((r) => r.ok).length}/${rs.length}, attempts ${all.length}, ` +
      `failed attempts ${bad} (${((bad / all.length) * 100).toFixed(0)}%), truncated ${all.filter((a) => a.kind === "truncated").length}, ` +
      `api errors ${rs.flatMap(attemptsOf).filter((a) => a.kind === "api_error").length}, total $${sum(rs.map((r) => r.costUsd)).toFixed(3)}, ` +
      `models returned ${[...new Set(rs.flatMap((r) => r.modelsReturned))].join(",")}`
  );
}

// Per config: stage costs as a linear function of evidence size, fitted through the smallest and largest pilot game.
type Pt = { tok: number; extractIn: number; extractOut: number; rateIn: number; rateOut: number; sec: number };
function points(cfg: string): Pt[] {
  const bySlug = new Map<string, RunRecord[]>();
  for (const r of recs.filter((x) => x.config.name === cfg && x.ok && x.kind === "e2e")) bySlug.set(r.slug, [...(bySlug.get(r.slug) ?? []), r]);
  return [...bySlug].map(([slug, rs]) => {
    const m = (f: (r: RunRecord) => number) => sum(rs.map(f)) / rs.length;
    const ok = (a: RunRecord["attempts"]["extract"]) => a.filter((x) => x.kind === "ok")[0];
    return {
      tok: loadSnapshot(slug).chars / 4,
      extractIn: m((r) => ok(r.attempts.extract).inputTokens),
      extractOut: m((r) => ok(r.attempts.extract).outputTokens + ok(r.attempts.extract).thinkingTokens),
      rateIn: m((r) => ok(r.attempts.rate).inputTokens),
      rateOut: m((r) => ok(r.attempts.rate).outputTokens + ok(r.attempts.rate).thinkingTokens),
      sec: m((r) => (ok(r.attempts.extract).latencyMs + ok(r.attempts.rate).latencyMs) / 1000),
    };
  }).sort((a, b) => a.tok - b.tok);
}
const lerp = (pts: Pt[], tok: number, f: (p: Pt) => number) => {
  if (pts.length === 1) return f(pts[0]);
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const t = Math.max(0, Math.min(1.3, (tok - a.tok) / (b.tok - a.tok)));
  return f(a) + (f(b) - f(a)) * t;
};

const MODEL: Record<string, string> = { A: "gemini-3.8-flash", B: "gemini-3.5-flash-lite" };
function e2eCost(cfg: string, slug: string, markup = 1) {
  const pts = points(cfg);
  const tok = loadSnapshot(slug).chars / 4;
  const inp = lerp(pts, tok, (p) => p.extractIn) + lerp(pts, tok, (p) => p.rateIn);
  const out = lerp(pts, tok, (p) => p.extractOut) + lerp(pts, tok, (p) => p.rateOut);
  return costUsd(MODEL[cfg], inp, out) * markup;
}
// Rating-only rerun: stage-2 call. Classification-only rerun: assumed 70% of a rating call (same input size, shorter output). Unmeasured.
function rateCost(cfg: string, slug: string) {
  const pts = points(cfg);
  const tok = loadSnapshot(slug).chars / 4;
  return costUsd(MODEL[cfg], lerp(pts, tok, (p) => p.rateIn), lerp(pts, tok, (p) => p.rateOut));
}

console.log("\nMeasured per-call model (tokens: in / out incl. thinking), by pilot game:");
for (const cfg of ["A", "B"]) for (const p of points(cfg))
  console.log(`  ${cfg} ~${Math.round(p.tok)} evidence tokens: extract ${Math.round(p.extractIn)}/${Math.round(p.extractOut)}, rate ${Math.round(p.rateIn)}/${Math.round(p.rateOut)}, ${p.sec.toFixed(0)}s`);

console.log("\nProjected cost (sync prices; 'batch' = 50% off, NOT yet verified to work with this harness):");
const fmt = (n: number) => `$${n.toFixed(2)}`;
const rows: Record<string, Record<string, number>> = {};
for (const cfg of ["A", "B"]) {
  const p1 = sum(DEV_GAMES.map((g) => e2eCost(cfg, g) * 5));
  const p2 = sum(DEV_GAMES.map((g) => rateCost(cfg, g) * 3 + rateCost(cfg, g) * 0.7 * 3));
  rows[cfg] = { p1, p2 };
}
const winner = (cfg: string) => {
  const p3 = sum(ROBUSTNESS_GAMES.map((g) => e2eCost(cfg, g) * 4 * 3));
  const p5 = sum(CONFIRM_GAMES.map((g) => e2eCost(cfg, g) * 3));
  return { p3, p5 };
};
console.log("  Phase 1 (7 games x 5 runs):  A " + fmt(rows.A.p1) + "   B " + fmt(rows.B.p1) + "   (both, sync " + fmt(rows.A.p1 + rows.B.p1) + ", batch " + fmt((rows.A.p1 + rows.B.p1) / 2) + ")");
console.log("  Phase 2 (3 reruns x 2 stages): A " + fmt(rows.A.p2) + "   B " + fmt(rows.B.p2) + "   (both, sync " + fmt(rows.A.p2 + rows.B.p2) + ", batch " + fmt((rows.A.p2 + rows.B.p2) / 2) + ")");
for (const cfg of ["A", "B"]) {
  const { p3, p5 } = winner(cfg);
  console.log(`  If ${cfg} wins: Phase 3 ${fmt(p3)} (36 calls), Confirmation ${fmt(p5)} (9 calls)`);
}
const spent = sum(recs.map((r) => r.costUsd));
for (const mode of ["sync", "batch"] as const) {
  const k = mode === "batch" ? 0.5 : 1;
  for (const cfg of ["A", "B"]) {
    const { p3, p5 } = winner(cfg);
    const total = (rows.A.p1 + rows.B.p1 + rows.A.p2 + rows.B.p2) * k + p3 + p5;
    console.log(`  TOTAL if ${cfg} wins, Phases 1-2 ${mode}, 3 and 5 sync: ${fmt(total)} (+ ${fmt(spent)} pilot = ${fmt(total + spent)})`);
  }
}
