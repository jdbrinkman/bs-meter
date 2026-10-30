// Agreement statistics for the reliability tests. No dependencies; tested in stats.test.ts.

/** Values per unit: each unit (item) has one entry per rater/run; null = missing. */
export type Matrix = (number | null)[][];

type Metric = "nominal" | "ordinal" | "interval";

/** Krippendorff's alpha, tolerant of missing values. Ordinal metric uses the cumulative marginal distribution. */
export function krippendorffAlpha(units: Matrix, metric: Metric = "ordinal"): number | null {
  const values = new Set<number>();
  for (const u of units) for (const v of u) if (v != null) values.add(v);
  const cats = [...values].sort((a, b) => a - b);
  if (cats.length < 2) return null; // no variation at all: alpha is undefined
  const idx = new Map(cats.map((c, i) => [c, i]));
  const k = cats.length;
  const o: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  for (const u of units) {
    const vs = u.filter((v): v is number => v != null);
    const m = vs.length;
    if (m < 2) continue;
    for (let a = 0; a < m; a++)
      for (let b = 0; b < m; b++) if (a !== b) o[idx.get(vs[a])!][idx.get(vs[b])!] += 1 / (m - 1);
  }
  const nc = o.map((row) => row.reduce((x, y) => x + y, 0));
  const n = nc.reduce((x, y) => x + y, 0);
  if (n <= 1) return null;
  const delta = (c: number, d: number): number => {
    if (c === d) return 0;
    if (metric === "nominal") return 1;
    if (metric === "interval") return (cats[c] - cats[d]) ** 2;
    const lo = Math.min(c, d), hi = Math.max(c, d);
    let sum = 0;
    for (let g = lo; g <= hi; g++) sum += nc[g];
    return (sum - (nc[lo] + nc[hi]) / 2) ** 2;
  };
  let Do = 0, De = 0;
  for (let c = 0; c < k; c++)
    for (let d = 0; d < k; d++) {
      Do += o[c][d] * delta(c, d);
      De += nc[c] * nc[d] * delta(c, d);
    }
  Do /= n;
  De /= n * (n - 1);
  return De === 0 ? null : 1 - Do / De;
}

/** Fleiss' kappa. counts[i][j] = number of raters who put item i in category j (same rater count for every item). */
export function fleissKappa(counts: number[][]): number | null {
  const N = counts.length;
  if (!N) return null;
  const n = counts[0].reduce((a, b) => a + b, 0);
  if (n < 2) return null;
  const k = counts[0].length;
  const pj = Array(k).fill(0);
  let Pbar = 0;
  for (const row of counts) {
    let s = 0;
    for (let j = 0; j < k; j++) { pj[j] += row[j]; s += row[j] * (row[j] - 1); }
    Pbar += s / (n * (n - 1));
  }
  Pbar /= N;
  const Pe = pj.reduce((a, c) => a + (c / (N * n)) ** 2, 0);
  return Pe === 1 ? null : (Pbar - Pe) / (1 - Pe);
}

/** Cohen's kappa for two raters over the same items (labels may be strings). Optional quadratic weights for ordered numeric labels. */
export function cohenKappa(a: (string | number)[], b: (string | number)[], quadratic = false): number | null {
  if (a.length !== b.length || !a.length) return null;
  const labels = [...new Set([...a, ...b])].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  const k = labels.length;
  if (k < 2) return null;
  const ix = new Map(labels.map((l, i) => [l, i]));
  const obs: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  a.forEach((v, i) => { obs[ix.get(v)!][ix.get(b[i])!] += 1; });
  const n = a.length;
  const ra = obs.map((r) => r.reduce((x, y) => x + y, 0));
  const cb = labels.map((_, j) => obs.reduce((s, r) => s + r[j], 0));
  const wt = (i: number, j: number) => (quadratic ? ((i - j) / (k - 1)) ** 2 : i === j ? 0 : 1);
  let num = 0, den = 0;
  for (let i = 0; i < k; i++)
    for (let j = 0; j < k; j++) {
      num += wt(i, j) * obs[i][j];
      den += wt(i, j) * ((ra[i] * cb[j]) / n);
    }
  return den === 0 ? null : 1 - num / den;
}

/** One-way random-effects ICC(1,1): rows are targets (games), columns are repeated runs. Rows need equal length. */
export function icc1(rows: number[][]): number | null {
  const n = rows.length;
  const k = rows[0]?.length ?? 0;
  if (n < 2 || k < 2) return null;
  const grand = rows.flat().reduce((a, b) => a + b, 0) / (n * k);
  let ssb = 0, ssw = 0;
  for (const r of rows) {
    const m = r.reduce((a, b) => a + b, 0) / k;
    ssb += k * (m - grand) ** 2;
    for (const v of r) ssw += (v - m) ** 2;
  }
  const msb = ssb / (n - 1);
  const msw = ssw / (n * (k - 1));
  const d = msb + (k - 1) * msw;
  return d === 0 ? null : (msb - msw) / d;
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
export const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
export const quantile = (xs: number[], q: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
};
export const median = (xs: number[]) => quantile(xs, 0.5);

/** Most common value (ties: the first seen) and its share. */
export function modal<T>(xs: T[]): { value: T; share: number } {
  const counts = new Map<T, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  let best: T = xs[0], bc = 0;
  for (const [v, c] of counts) if (c > bc) { best = v; bc = c; }
  return { value: best, share: xs.length ? bc / xs.length : NaN };
}

/** Seeded RNG (mulberry32) so shuffles and bootstraps are reproducible. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bootstrap 95% interval for a statistic computed over groups (resample groups with replacement). */
export function bootstrapCI<G>(groups: G[], stat: (gs: G[]) => number | null, reps = 1000, seed = 7): [number, number] | null {
  if (groups.length < 2) return null;
  const r = rng(seed);
  const out: number[] = [];
  for (let i = 0; i < reps; i++) {
    const sample = Array.from({ length: groups.length }, () => groups[Math.floor(r() * groups.length)]);
    const v = stat(sample);
    if (v != null && Number.isFinite(v)) out.push(v);
  }
  return out.length >= reps * 0.5 ? [quantile(out, 0.025), quantile(out, 0.975)] : null;
}
