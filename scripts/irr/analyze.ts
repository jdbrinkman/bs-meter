/**
 * Reliability analysis. Reads run files under tmp/irr/runs/<phase>/, writes tmp/irr/reports/<name>.md + .json.
 * Thresholds are the ones fixed in docs/reliability-test-plan.md section 5 before any run.
 *
 *   npx tsx scripts/irr/analyze.ts retest   --phase phase1 [--name phase1]
 *   npx tsx scripts/irr/analyze.ts cross    --a phase1 --b phase1       (config A vs B medians)
 *   npx tsx scripts/irr/analyze.ts stages   --phase phase2 --from phase1
 *   npx tsx scripts/irr/analyze.ts robust   --phase phase3 --base phase1 --config A
 *   npx tsx scripts/irr/analyze.ts plausible --phase phase1 --config A
 *   npx tsx scripts/irr/analyze.ts sensitivity --phase phase1 --config A
 */
import { evidenceText, quoteAppearsIn } from "@/lib/pipeline/evidence";
import fs from "node:fs";
import path from "node:path";
import { OUT, RUN_DIR, loadSnapshot, readJson, writeJson } from "./common";
import type { RunRecord } from "./run";
import {
  bootstrapCI, cohenKappa, fleissKappa, icc1, krippendorffAlpha, mean, median, modal, quantile, sd,
} from "./stats";
import {
  JUICE, JUICE_KEYS, JUICE_WEIGHTS, MEASURES, SQUEEZE, SQUEEZE_KEYS, VERDICTS, computeBsIndex, computeJuiceIndex,
  deriveVerdictV2, ratingValue, type Ratings,
} from "@/lib/scoring/v2";

const arg = (n: string, d?: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : d;
};

export function loadRuns(phase: string): RunRecord[] {
  const dir = path.join(RUN_DIR, phase);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => readJson<RunRecord>(path.join(dir, f)));
}

const pct = (x: number) => (Number.isFinite(x) ? `${(x * 100).toFixed(0)}%` : "n/a");
const f2 = (x: number | null | undefined) => (x == null || !Number.isFinite(x) ? "n/a" : x.toFixed(2));
const ci = (c: [number, number] | null) => (c ? ` [${c[0].toFixed(2)}, ${c[1].toFixed(2)}]` : "");

type Item = { slug: string; measure: string; vals: (number | null)[]; cats: ("rated" | "N/A" | "n/d")[] };

export function itemsFor(recs: RunRecord[]): Item[] {
  const bySlug = new Map<string, RunRecord[]>();
  for (const r of recs) if (r.ok && r.analysis) bySlug.set(r.slug, [...(bySlug.get(r.slug) ?? []), r]);
  const out: Item[] = [];
  for (const [slug, rs] of bySlug)
    for (const m of MEASURES) {
      const rr = rs.map((r) => r.analysis!.ratings[m.key]);
      out.push({
        slug, measure: m.key,
        vals: rr.map((x) => (x.status === "rated" ? x.rating : null)),
        cats: rr.map((x) => (x.status === "rated" ? "rated" : x.status === "not_applicable" ? "N/A" : "n/d")),
      });
    }
  return out;
}

const rated = (it: Item) => it.vals.filter((v): v is number => v != null);
const range = (xs: number[]) => Math.max(...xs) - Math.min(...xs);

type Stability = {
  items: number; comparable: number; stability: number; modalAgreement: number; largeSwings: number;
  perMeasure: Record<string, { n: number; stability: number; modal: number }>;
  least: { slug: string; measure: string; vals: (number | null)[] }[];
};

function stability(items: Item[]): Stability {
  const comp = items.filter((i) => rated(i).length >= 2);
  const stab = comp.filter((i) => range(rated(i)) <= 1);
  const perMeasure: Stability["perMeasure"] = {};
  for (const m of MEASURES) {
    const mi = comp.filter((i) => i.measure === m.key);
    perMeasure[m.key] = {
      n: mi.length,
      stability: mi.length ? mi.filter((i) => range(rated(i)) <= 1).length / mi.length : NaN,
      modal: mi.length ? mean(mi.map((i) => modal(rated(i)).share)) : NaN,
    };
  }
  return {
    items: items.length, comparable: comp.length,
    stability: comp.length ? stab.length / comp.length : NaN,
    modalAgreement: comp.length ? mean(comp.map((i) => modal(rated(i)).share)) : NaN,
    largeSwings: comp.length ? comp.filter((i) => range(rated(i)) >= 3).length / comp.length : NaN,
    perMeasure,
    least: [...comp].sort((a, b) => range(rated(b)) - range(rated(a))).slice(0, 12).map((i) => ({ slug: i.slug, measure: i.measure, vals: i.vals })),
  };
}

function alphaOf(items: Item[], keys?: string[]): number | null {
  const sel = keys ? items.filter((i) => keys.includes(i.measure)) : items;
  return krippendorffAlpha(sel.map((i) => i.vals), "ordinal");
}
function alphaCI(items: Item[], keys?: string[]) {
  const groups = [...new Set(items.map((i) => i.slug))].map((s) => items.filter((i) => i.slug === s));
  return bootstrapCI(groups, (gs) => alphaOf(gs.flat(), keys));
}

function indexStats(recs: RunRecord[]) {
  const bySlug = new Map<string, RunRecord[]>();
  for (const r of recs) if (r.ok && r.indexes) bySlug.set(r.slug, [...(bySlug.get(r.slug) ?? []), r]);
  const rows = [...bySlug].map(([slug, rs]) => {
    const j = rs.map((r) => r.indexes!.juice).filter((v): v is number => v != null);
    const b = rs.map((r) => r.indexes!.bs).filter((v): v is number => v != null);
    const vs = rs.map((r) => r.indexes!.verdict);
    const mv = modal(vs);
    return {
      slug, runs: rs.length, juiceSd: sd(j), bsSd: sd(b), juiceMean: mean(j), bsMean: mean(b),
      juiceRange: j.length ? Math.max(...j) - Math.min(...j) : 0, bsRange: b.length ? Math.max(...b) - Math.min(...b) : 0,
      verdicts: vs, modalVerdict: mv.value, modalShare: mv.share,
      both: vs.includes("worth-it") && vs.includes("skip"),
      provisionalRuns: rs.filter((r) => r.indexes!.provisional).length,
    };
  });
  const sds = rows.flatMap((r) => [r.juiceSd, r.bsSd]);
  const minRuns = Math.min(...rows.map((r) => r.runs));
  const iccOf = (get: (r: RunRecord) => number | null) => {
    const m = [...bySlug.values()].map((rs) => rs.map(get).filter((v): v is number => v != null).slice(0, minRuns));
    return m.every((x) => x.length === minRuns) ? icc1(m) : null;
  };
  return {
    rows, medianSd: median(sds), p95Sd: quantile(sds, 0.95),
    verdictStable: rows.filter((r) => r.modalShare >= 0.8).length / rows.length,
    anyBoth: rows.some((r) => r.both),
    iccJuice: iccOf((r) => r.indexes!.juice), iccBs: iccOf((r) => r.indexes!.bs),
  };
}

function applicabilityKappa(items: Item[]) {
  const n = Math.min(...items.map((i) => i.cats.length));
  const counts = items.map((i) => {
    const c = [0, 0, 0];
    i.cats.slice(0, n).forEach((x) => { c[x === "rated" ? 0 : x === "N/A" ? 1 : 2]++; });
    return c;
  });
  return fleissKappa(counts);
}

/** Share of median-run observations that also appear in at least `need` runs (matching by source + quote words). */
function extractionStability(recs: RunRecord[]) {
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2));
  const jac = (a: Set<string>, b: Set<string>) => {
    if (!a.size || !b.size) return 0;
    let i = 0;
    for (const w of a) if (b.has(w)) i++;
    return i / (a.size + b.size - i);
  };
  const bySlug = new Map<string, RunRecord[]>();
  for (const r of recs) if (r.ok && r.observations) bySlug.set(r.slug, [...(bySlug.get(r.slug) ?? []), r]);
  let total = 0, found = 0;
  const perGame: Record<string, { share: number; obsPerRun: number[] }> = {};
  for (const [slug, rs] of bySlug) {
    const sorted = [...rs].sort((a, b) => a.observations!.length - b.observations!.length);
    const med = sorted[Math.floor(sorted.length / 2)];
    const need = Math.ceil(0.8 * rs.length);
    let g = 0;
    for (const o of med.observations!) {
      const ow = words(o.quote || o.summary);
      let hits = 1;
      for (const r of rs) {
        if (r === med) continue;
        const hit = r.observations!.some((p) => {
          const sameSrc = p.source.toLowerCase().includes(o.source.toLowerCase().slice(0, 6)) || o.source.toLowerCase().includes(p.source.toLowerCase().slice(0, 6));
          const sameQuote = sameSrc && jac(ow, words(p.quote || p.summary)) >= (o.quote ? 0.5 : 0.35);
          // The model often quotes a different line for the same point, so also count the same measure and
          // polarity with similar summary wording.
          const sameTopic = p.measure === o.measure && p.polarity === o.polarity && jac(words(o.summary), words(p.summary)) >= 0.3;
          return sameQuote || sameTopic;
        });
        if (hit) hits++;
      }
      total++;
      if (hits >= need) { found++; g++; }
    }
    perGame[slug] = { share: g / med.observations!.length, obsPerRun: rs.map((r) => r.observations!.length) };
  }
  return { share: total ? found / total : NaN, perGame };
}

/** Fraction of quoted passages that really appear in the frozen evidence. */
function quoteCheck(recs: RunRecord[]) {
  const cache = new Map<string, string>();
  const text = (slug: string) => {
    if (!cache.has(slug)) {
      const s = loadSnapshot(slug);
      cache.set(slug, evidenceText(s.sources, s.critics));
    }
    return cache.get(slug)!;
  };
  let withQuote = 0, found = 0;
  const misses: { slug: string; run: string; source: string; quote: string }[] = [];
  for (const r of recs) {
    if (!r.ok || !r.observations) continue;
    for (const o of r.observations) {
      if (!o.quote) continue;
      withQuote++;
      if (quoteAppearsIn(o.quote, text(r.slug))) found++;
      else if (misses.length < 15) misses.push({ slug: r.slug, run: `${r.config.name} r${r.run}`, source: o.source, quote: o.quote });
    }
  }
  return { withQuote, found, share: withQuote ? found / withQuote : NaN, misses };
}

function failureStats(recs: RunRecord[]) {
  const attempts = recs.flatMap((r) => [...r.attempts.extract, ...r.attempts.rate, ...r.attempts.classify]).filter((a) => a.kind !== "api_error");
  const bad = attempts.filter((a) => a.kind !== "ok");
  return {
    runs: recs.length, okRuns: recs.filter((r) => r.ok).length, attempts: attempts.length, failedAttempts: bad.length,
    failureRate: attempts.length ? bad.length / attempts.length : NaN,
    truncated: attempts.filter((a) => a.kind === "truncated").length,
    invalid: attempts.filter((a) => a.kind === "invalid").length,
    apiErrors: recs.flatMap((r) => [...r.attempts.extract, ...r.attempts.rate, ...r.attempts.classify]).filter((a) => a.kind === "api_error").length,
    cost: recs.reduce((n, r) => n + r.costUsd, 0),
    models: [...new Set(recs.flatMap((r) => r.modelsReturned))],
    minutes: recs.reduce((n, r) => n + [...r.attempts.extract, ...r.attempts.rate].reduce((m, a) => m + a.latencyMs, 0), 0) / 60000,
  };
}

type Gate = { metric: string; value: string; pass: boolean; marginal?: boolean; rule: string };

function retestReport(recs: RunRecord[], label: string) {
  const ok = recs.filter((r) => r.kind === "e2e" && r.variant === "base");
  const items = itemsFor(ok);
  const st = stability(items);
  const ix = indexStats(ok);
  const fs_ = failureStats(recs);
  const aAll = alphaOf(items), aJ = alphaOf(items, JUICE_KEYS), aS = alphaOf(items, SQUEEZE_KEYS);
  const kappaApp = applicabilityKappa(items);
  const ext = extractionStability(ok);
  const q = quoteCheck(ok);
  const perMeasureOk = MEASURES.every((m) => !(st.perMeasure[m.key].stability < 0.8));
  const gates: Gate[] = [
    { metric: "Pooled alpha (ordinal)", value: f2(aAll), pass: (aAll ?? 0) >= 0.8, marginal: (aAll ?? 0) >= 0.67, rule: ">= 0.80 (marginal 0.67-0.80)" },
    { metric: "Item stability (range <= 1)", value: pct(st.stability), pass: st.stability >= 0.9, rule: ">= 90%" },
    { metric: "Per-measure stability", value: perMeasureOk ? "all >= 80%" : "some < 80%", pass: perMeasureOk, rule: ">= 80% each" },
    { metric: "Modal agreement", value: pct(st.modalAgreement), pass: st.modalAgreement >= 0.7, rule: ">= 70%" },
    { metric: "Large swings (range >= 3)", value: pct(st.largeSwings), pass: st.largeSwings <= 0.02, rule: "<= 2%" },
    { metric: "Index SD, median", value: f2(ix.medianSd), pass: ix.medianSd <= 3, rule: "<= 3" },
    { metric: "Index SD, 95th pct", value: f2(ix.p95Sd), pass: ix.p95Sd <= 6, rule: "<= 6" },
    { metric: "Verdict stability (>= 80% of runs agree)", value: pct(ix.verdictStable), pass: ix.verdictStable >= 0.9 && !ix.anyBoth, rule: ">= 90% of games, none with both Worth it and Skip" },
    { metric: "Applicability kappa (Fleiss)", value: f2(kappaApp), pass: (kappaApp ?? 0) >= 0.8, rule: ">= 0.80" },
    { metric: "Extraction stability (exploratory)", value: pct(ext.share), pass: ext.share >= 0.7, rule: ">= 70%, no hard gate" },
  ];
  const hardGates = gates.filter((g) => !g.metric.startsWith("Extraction"));
  const passes = hardGates.every((g) => g.pass);
  const md: string[] = [];
  md.push(`## ${label}`, "");
  md.push(`Runs: ${fs_.okRuns}/${fs_.runs} ok. Failed model attempts ${fs_.failedAttempts}/${fs_.attempts} (${pct(fs_.failureRate)}; truncated ${fs_.truncated}, invalid ${fs_.invalid}); transient API errors retried ${fs_.apiErrors}. Cost $${fs_.cost.toFixed(2)}. Model(s) returned: ${fs_.models.join(", ")}.`, "");
  md.push(`Alpha: pooled ${f2(aAll)}${ci(alphaCI(items))}; juice ${f2(aJ)}${ci(alphaCI(items, JUICE_KEYS))}; squeeze ${f2(aS)}${ci(alphaCI(items, SQUEEZE_KEYS))}. ICC(1,1): juice index ${f2(ix.iccJuice)}, BS index ${f2(ix.iccBs)}.`, "");
  md.push("| Metric | Value | Rule | Result |", "|---|---|---|---|");
  for (const g of gates) md.push(`| ${g.metric} | ${g.value} | ${g.rule} | ${g.pass ? "PASS" : g.marginal ? "marginal" : "FAIL"} |`);
  md.push("", `**Config ${passes ? "PASSES" : "does not pass"} every hard gate.**`, "");
  md.push("### Per measure", "", "| Measure | Items compared | Stability | Modal agreement | Not-discussed / N/A share |", "|---|---|---|---|---|");
  for (const m of MEASURES) {
    const mi = items.filter((i) => i.measure === m.key);
    const empty = mi.length ? mi.flatMap((i) => i.cats).filter((c) => c !== "rated").length / mi.flatMap((i) => i.cats).length : NaN;
    md.push(`| ${m.label} (${m.side}) | ${st.perMeasure[m.key].n} | ${pct(st.perMeasure[m.key].stability)} | ${pct(st.perMeasure[m.key].modal)} | ${pct(empty)} |`);
  }
  md.push("", "### Per game (index across runs)", "", "| Game | Runs | Juice mean (SD, range) | BS mean (SD, range) | Verdicts | Provisional runs |", "|---|---|---|---|---|---|");
  for (const r of ix.rows)
    md.push(`| ${r.slug} | ${r.runs} | ${r.juiceMean.toFixed(0)} (${r.juiceSd.toFixed(1)}, ${r.juiceRange}) | ${r.bsMean.toFixed(0)} (${r.bsSd.toFixed(1)}, ${r.bsRange}) | ${r.verdicts.map((v) => VERDICTS[v as keyof typeof VERDICTS]?.label ?? v).join(" / ")} | ${r.provisionalRuns} |`);
  md.push("", "### Least stable items", "", "| Game | Measure | Ratings across runs (n/d = not discussed, N/A) |", "|---|---|---|");
  for (const l of st.least) {
    const it = items.find((i) => i.slug === l.slug && i.measure === l.measure)!;
    md.push(`| ${l.slug} | ${l.measure} | ${it.vals.map((v, k) => v ?? it.cats[k]).join(", ")} |`);
  }
  md.push("", `### Extraction and quotes`, "", `Issues found again in >= 80% of runs (median run as reference): ${pct(ext.share)}. Observations per run by game: ${Object.entries(ext.perGame).map(([s, g]) => `${s} ${g.obsPerRun.join("/")}`).join("; ")}.`);
  md.push("", `Quote check: ${q.found}/${q.withQuote} quoted passages (${pct(q.share)}) appear verbatim (after normalising punctuation and case) in the frozen evidence.${q.misses.length ? " Examples that did not match:" : ""}`);
  for (const m of q.misses.slice(0, 6)) md.push(`- ${m.slug} ${m.run} (${m.source}): "${m.quote}"`);
  return { md: md.join("\n"), json: { label, gates, passes, stability: st, index: ix, failure: fs_, alpha: { all: aAll, juice: aJ, squeeze: aS }, kappaApp, extraction: ext, quotes: q } };
}

export function medianRatings(recs: RunRecord[]): Map<string, Ratings> {
  const bySlug = new Map<string, RunRecord[]>();
  for (const r of recs) if (r.ok && r.analysis) bySlug.set(r.slug, [...(bySlug.get(r.slug) ?? []), r]);
  const out = new Map<string, Ratings>();
  for (const [slug, rs] of bySlug) {
    const ratings: Ratings = {};
    for (const m of MEASURES) {
      const vs = rs.map((r) => r.analysis!.ratings[m.key]);
      const nums = vs.map((v) => (v.status === "rated" ? v.rating! : null)).filter((v): v is number => v != null);
      if (nums.length >= Math.ceil(vs.length / 2)) {
        ratings[m.key] = { rating: Math.round(median(nums)), status: "rated", reason: "", source: "", basis: "direct", issue_ids: [] };
      } else {
        const na = vs.filter((v) => v.status === "not_applicable").length;
        ratings[m.key] = { rating: null, status: na >= vs.length / 2 ? "not_applicable" : "not_discussed", reason: "", source: "", basis: "inferred", issue_ids: [] };
      }
    }
    out.set(slug, ratings);
  }
  return out;
}

function crossModel(a: RunRecord[], b: RunRecord[]) {
  const ma = medianRatings(a), mb = medianRatings(b);
  const xs: number[] = [], ys: number[] = [];
  const diffs: { slug: string; measure: string; a: number | null; b: number | null }[] = [];
  let verdictAgree = 0, games = 0;
  const vrows: string[] = [];
  for (const [slug, ra] of ma) {
    const rb = mb.get(slug);
    if (!rb) continue;
    for (const m of MEASURES) {
      const va = ratingValue(ra[m.key]), vb = ratingValue(rb[m.key]);
      if (va != null && vb != null) { xs.push(va); ys.push(vb); if (va !== vb) diffs.push({ slug, measure: m.key, a: va, b: vb }); }
    }
    const snap = loadSnapshot(slug);
    const verdict = (r: Ratings) =>
      deriveVerdictV2({ juice: computeJuiceIndex(r, snap.genreKey), bs: computeBsIndex(r), broken: ratingValue(r.broken), priceUsd: snap.game.current_price_usd ?? snap.game.price_usd, releaseDate: snap.game.release_date });
    const [va, vb] = [verdict(ra), verdict(rb)];
    games++; if (va === vb) verdictAgree++;
    vrows.push(`| ${slug} | ${VERDICTS[va].label} | ${VERDICTS[vb].label} |`);
  }
  const qwk = cohenKappa(xs, ys, true);
  const mad = mean(xs.map((x, i) => Math.abs(x - ys[i])));
  const md = [
    "## Cross-model (A vs B, median of runs per item)", "",
    `Items rated by both: ${xs.length}. Quadratic-weighted kappa ${f2(qwk)} (pass >= 0.75: ${(qwk ?? 0) >= 0.75 ? "PASS" : "FAIL"}). Mean absolute difference ${f2(mad)} (pass <= 0.5: ${mad <= 0.5 ? "PASS" : "FAIL"}). Exact agreement ${pct(xs.filter((x, i) => x === ys[i]).length / xs.length)}. Verdict agreement on median ratings: ${verdictAgree}/${games}.`, "",
    "| Game | Verdict A | Verdict B |", "|---|---|---|", ...vrows, "",
    "Largest disagreements:", ...diffs.sort((p, q) => Math.abs((q.a ?? 0) - (q.b ?? 0)) - Math.abs((p.a ?? 0) - (p.b ?? 0))).slice(0, 10).map((d) => `- ${d.slug} ${d.measure}: A ${d.a}, B ${d.b}`),
  ].join("\n");
  return { md, json: { qwk, mad, items: xs.length, verdictAgree, games } };
}

function stagesReport(phase2: RunRecord[], phase1: RunRecord[], cfg: string) {
  const rate = phase2.filter((r) => r.kind === "rate" && r.config.name === cfg);
  const cls = phase2.filter((r) => r.kind === "classify" && r.config.name === cfg);
  const md: string[] = [`## Phase 2: where does the noise come from (config ${cfg})`, ""];
  // Rating stage on a frozen observation list
  const items = itemsFor(rate);
  const st = stability(items);
  const ix = indexStats(rate);
  md.push(`### Rating step only (frozen observation list, ${rate.filter((r) => r.ok).length} reruns)`, "",
    `Alpha ${f2(alphaOf(items))}${ci(alphaCI(items))}; item stability ${pct(st.stability)}; modal agreement ${pct(st.modalAgreement)}; large swings ${pct(st.largeSwings)}; index SD median ${f2(ix.medianSd)}, p95 ${f2(ix.p95Sd)}; verdict stability ${pct(ix.verdictStable)}.`, "");
  // Compare with end to end
  const e2e = phase1.filter((r) => r.config.name === cfg && r.kind === "e2e" && r.variant === "base");
  const eItems = itemsFor(e2e), eSt = stability(eItems), eIx = indexStats(e2e);
  md.push(`For comparison, end to end (phase 1): alpha ${f2(alphaOf(eItems))}, stability ${pct(eSt.stability)}, index SD median ${f2(eIx.medianSd)}. The gap between the two is the noise added by the extraction stage.`, "");
  // Classification on a frozen list
  const byGame = new Map<string, RunRecord[]>();
  for (const r of cls) if (r.ok && r.classifications) byGame.set(r.slug, [...(byGame.get(r.slug) ?? []), r]);
  const cats = MEASURES.map((m) => m.key);
  const counts: number[][] = [];
  const shares: number[] = [];
  let withOriginal = 0, nObs = 0;
  const confusion = new Map<string, number>();
  for (const [, rs] of byGame) {
    const obs = rs[0].observations!;
    for (const o of obs) {
      const labels = rs.map((r) => r.classifications!.find((c) => c.id === o.id)?.measure).filter((x): x is string => !!x);
      if (labels.length < rs.length) continue;
      const c = Array(cats.length).fill(0);
      labels.forEach((l) => { c[cats.indexOf(l)]++; });
      counts.push(c);
      shares.push(modal(labels).share);
      nObs++;
      if (modal(labels).value === o.measure) withOriginal++;
      const distinct = [...new Set(labels)];
      if (distinct.length > 1) {
        const key = distinct.sort().join(" vs ");
        confusion.set(key, (confusion.get(key) ?? 0) + 1);
      }
    }
  }
  const kap = fleissKappa(counts);
  md.push(`### Classification step only (frozen observation list)`, "",
    `${nObs} observations x ${cls.filter((r) => r.ok).length / Math.max(1, byGame.size)} reruns each. Mean share of reruns picking the modal measure ${pct(mean(shares))} (pass >= 80%: ${mean(shares) >= 0.8 ? "PASS" : "FAIL"}); Fleiss kappa ${f2(kap)} (pass >= 0.70: ${(kap ?? 0) >= 0.7 ? "PASS" : "FAIL"}). The modal label matches the stage-1 label for ${pct(withOriginal / nObs)} of observations.`, "");
  const conf = [...confusion].sort((a, b) => b[1] - a[1]).slice(0, 12);
  md.push("Measure pairs that get mixed up (observations where reruns disagreed):", "", ...conf.map(([k, v]) => `- ${k}: ${v}`));
  return { md: md.join("\n"), json: { ratingStep: { alpha: alphaOf(items), stability: st.stability, indexSd: ix.medianSd }, classification: { n: nObs, modalShare: mean(shares), kappa: kap, confusion: conf } } };
}

function robustReport(variants: RunRecord[], base: RunRecord[], cfg: string) {
  const baseRecs = base.filter((r) => r.config.name === cfg && r.kind === "e2e" && r.variant === "base");
  const bm = medianRatings(baseRecs);
  const bIx = indexStats(baseRecs);
  const md: string[] = [`## Phase 3: irrelevant-change robustness (config ${cfg})`, "",
    "Baseline = median rating per item across phase 1 runs of the same games and config. Shift = absolute change of a variant run's rating from that baseline (items rated in both).", "",
    "| Variant | Runs ok | Median abs shift | Mean abs shift | Share of items moved >= 2 | Verdict flips vs baseline | General-knowledge citations |", "|---|---|---|---|---|---|---|"];
  const out: Record<string, unknown> = {};
  for (const v of ["shuffle", "dupes", "reworded", "masked"]) {
    const rs = variants.filter((r) => r.config.name === cfg && r.variant === v && r.ok && r.analysis);
    const shifts: number[] = [];
    let flips = 0, gk = 0, sources = 0;
    for (const r of rs) {
      const b = bm.get(r.slug);
      if (!b) continue;
      for (const m of MEASURES) {
        const x = r.analysis!.ratings[m.key];
        const bv = ratingValue(b[m.key]);
        if (x.status === "rated" && bv != null) shifts.push(Math.abs(x.rating! - bv));
        if (x.status === "rated") { sources++; if (/general knowledge/i.test(x.source)) gk++; }
      }
      const baseVerdict = bIx.rows.find((x) => x.slug === r.slug)?.modalVerdict;
      if (baseVerdict && r.indexes && r.indexes.verdict !== baseVerdict) flips++;
    }
    out[v] = { runs: rs.length, medianShift: median(shifts), meanShift: mean(shifts), flips };
    md.push(`| ${v} | ${rs.length} | ${f2(median(shifts))} | ${f2(mean(shifts))} | ${pct(shifts.filter((s) => s >= 2).length / Math.max(1, shifts.length))} | ${flips} of ${rs.length} | ${gk}/${sources} |`);
  }
  md.push("", "Pass rule: median absolute shift <= 0.5 and at most 1 verdict flip across the subset. 'masked' shows how much the model leans on memory of the game; a large shift there means ratings partly come from what it remembers, not the sources.");
  return { md: md.join("\n"), json: out };
}

function plausibleReport(recs: RunRecord[]) {
  const ok = recs.filter((r) => r.kind === "e2e" && r.variant === "base" && r.ok && r.analysis);
  const bySlug = new Map<string, RunRecord[]>();
  for (const r of ok) bySlug.set(r.slug, [...(bySlug.get(r.slug) ?? []), r]);
  const md = ["## Plausibility checks (non-human proxies; flags, not proof)", "",
    "| Game | Completionist / main hours | Achievements earned by < 5% | Padding (mean) | Recent Steam positive | Broken (mean) | Grind (mean) |", "|---|---|---|---|---|---|---|"];
  for (const [slug, rs] of bySlug) {
    const g = loadSnapshot(slug).game;
    const f = g.steam_facts as { achievements?: { rareShare: number | null } | null; reviews?: { recent?: { percentPositive: number | null } | null } } | null;
    const avg = (k: string) => {
      const v = rs.map((r) => ratingValue(r.analysis!.ratings[k])).filter((x): x is number => x != null);
      return v.length ? mean(v).toFixed(1) : "n/d";
    };
    const ratio = g.main_story_hours && g.completionist_hours ? (g.completionist_hours / g.main_story_hours).toFixed(1) + "x" : "n/a";
    md.push(`| ${slug} | ${ratio} | ${f?.achievements?.rareShare != null ? pct(f.achievements.rareShare) : "n/a"} | ${avg("padding")} | ${f?.reviews?.recent?.percentPositive != null ? f.reviews.recent.percentPositive + "%" : "n/a"} | ${avg("broken")} | ${avg("grind")} |`);
  }
  // Genre profile distributions
  md.push("", "### Mean rating by genre profile (a measure that tracks the genre label more than the evidence is suspect)", "", `| Profile | Games | ${MEASURES.map((m) => m.label).join(" | ")} |`, `|---|---|${MEASURES.map(() => "---").join("|")}|`);
  const byGenre = new Map<string, RunRecord[]>();
  for (const r of ok) byGenre.set(loadSnapshot(r.slug).genreKey, [...(byGenre.get(loadSnapshot(r.slug).genreKey) ?? []), r]);
  for (const [gk, rs] of byGenre) {
    const cells = MEASURES.map((m) => {
      const v = rs.map((r) => ratingValue(r.analysis!.ratings[m.key])).filter((x): x is number => x != null);
      return v.length ? mean(v).toFixed(1) : "-";
    });
    md.push(`| ${gk} | ${new Set(rs.map((r) => r.slug)).size} | ${cells.join(" | ")} |`);
  }
  return { md: md.join("\n"), json: {} };
}

function sensitivityReport(recs: RunRecord[]) {
  const ok = recs.filter((r) => r.kind === "e2e" && r.variant === "base" && r.ok);
  const med = medianRatings(ok);
  const md = ["## Sensitivity of verdicts to unvalidated design choices (offline, no AI calls)", "",
    "Computed from the median ratings per game. 'Current' = profile Juice weights and BS = worst three at 50/30/20.", "",
    "| Game | Current | Equal Juice weights | Default-profile Juice weights | BS = mean of rated | BS = worst only | BS = worst two 60/40 |", "|---|---|---|---|---|---|---|"];
  const changes = { equalJuice: 0, defaultJuice: 0, bsMean: 0, bsMax: 0, bsTwo: 0 };
  let n = 0;
  for (const [slug, r] of med) {
    const snap = loadSnapshot(slug);
    const price = snap.game.current_price_usd ?? snap.game.price_usd;
    const broken = ratingValue(r.broken);
    const v = (juice: number | null, bs: number | null) => deriveVerdictV2({ juice, bs, broken, priceUsd: price, releaseDate: snap.game.release_date });
    const unit = (x: number) => (x - 1) / 4;
    const equalJ = (() => { const vs = JUICE.map((m) => ratingValue(r[m.key])).filter((x): x is number => x != null); return vs.length ? Math.round(mean(vs.map(unit)) * 100) : null; })();
    const sq = SQUEEZE.map((m) => ratingValue(r[m.key])).filter((x): x is number => x != null).sort((a, b) => b - a);
    const bsMean = sq.length ? Math.round(mean(sq.map(unit)) * 100) : null;
    const bsMax = sq.length ? Math.round(unit(sq[0]) * 100) : null;
    const bsTwo = sq.length ? Math.round(((sq.length > 1 ? 0.6 * unit(sq[0]) + 0.4 * unit(sq[1]) : unit(sq[0]))) * 100) : null;
    const j = computeJuiceIndex(r, snap.genreKey), b = computeBsIndex(r);
    const cur = v(j, b), e = v(equalJ, b), d = v(computeJuiceIndex(r, "default"), b), m1 = v(j, bsMean), m2 = v(j, bsMax), m3 = v(j, bsTwo);
    n++;
    if (e !== cur) changes.equalJuice++;
    if (d !== cur) changes.defaultJuice++;
    if (m1 !== cur) changes.bsMean++;
    if (m2 !== cur) changes.bsMax++;
    if (m3 !== cur) changes.bsTwo++;
    const L = (x: string) => VERDICTS[x as keyof typeof VERDICTS].label;
    md.push(`| ${slug} (J ${j}, BS ${b}) | ${L(cur)} | ${L(e)} | ${L(d)} | ${L(m1)} (BS ${bsMean}) | ${L(m2)} (BS ${bsMax}) | ${L(m3)} (BS ${bsTwo}) |`);
  }
  md.push("", `Games whose verdict changes (of ${n}): equal Juice weights ${changes.equalJuice}, default-profile weights ${changes.defaultJuice}, BS mean ${changes.bsMean}, BS worst-only ${changes.bsMax}, BS worst-two ${changes.bsTwo}.`);
  void JUICE_WEIGHTS;
  return { md: md.join("\n"), json: changes };
}

function save(name: string, r: { md: string; json: unknown }) {
  const dir = path.join(OUT, "reports");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.md`), r.md + "\n");
  writeJson(path.join(dir, `${name}.json`), r.json);
  console.log(r.md);
}

function main() {
  const cmd = process.argv[2];
  const phase = arg("phase", "phase1")!;
  const cfg = arg("config", "A")!;
  if (cmd === "retest") {
    const recs = loadRuns(phase);
    for (const c of ["A", "B"]) {
      const rs = recs.filter((r) => r.config.name === c);
      if (rs.length) save(`${arg("name", phase)}-${c}`, retestReport(rs, `${arg("name", phase)}: config ${c} (${rs[0].config.model}, thinking ${rs[0].config.thinkingLevel})`));
    }
  } else if (cmd === "cross") {
    const recs = loadRuns(arg("a", "phase1")!).filter((r) => r.kind === "e2e" && r.variant === "base");
    save("cross-model", crossModel(recs.filter((r) => r.config.name === "A"), recs.filter((r) => r.config.name === "B")));
  } else if (cmd === "stages") {
    save(`phase2-${cfg}`, stagesReport(loadRuns(phase), loadRuns(arg("from", "phase1")!), cfg));
  } else if (cmd === "robust") {
    save(`phase3-${cfg}`, robustReport(loadRuns(phase), loadRuns(arg("base", "phase1")!), cfg));
  } else if (cmd === "plausible") {
    save(`plausibility-${cfg}`, plausibleReport(loadRuns(phase).filter((r) => r.config.name === cfg)));
  } else if (cmd === "sensitivity") {
    save(`sensitivity-${cfg}`, sensitivityReport(loadRuns(phase).filter((r) => r.config.name === cfg)));
  } else console.log("commands: retest | cross | stages | robust | plausible | sensitivity");
}

if (require.main === module) main();
