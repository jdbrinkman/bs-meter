import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { resolveGenreKey } from "@/config/game-profiles";
import { dedupeSources } from "@/lib/pipeline/evidence";
import type { ModelConfig } from "@/lib/ai/gemini";
import type { CriticSnippet } from "@/lib/ai/v2/prompt";
import type { Game, ReviewSource } from "@/lib/types";

// Everything the harness writes goes under tmp/irr/ (git-ignored). Nothing here touches the scores table.
export const ROOT = path.resolve(__dirname, "../..");
export const OUT = path.join(ROOT, "tmp", "irr");
export const SNAP_DIR = path.join(OUT, "snapshots");
export const RUN_DIR = path.join(OUT, "runs");
export const LEDGER = path.join(OUT, "ledger.jsonl");

/** Hard stop for the cost meter (USD). The total budget is $10. Raised from 8 to 9.75 for the v3.1 stage-1 test (approved: about $1.7). */
export const COST_CAP_USD = 9.75;

export const DEV_GAMES = [
  "lorelei-and-the-laser-eyes",
  "xcom-2",
  "final-fantasy-tactics-the-ivalice-chronicles",
  "assassins-creed-valhalla",
  "redfall",
  "hades-2",
  "the-witcher-3-wild-hunt",
];
export const CONFIRM_GAMES = ["sekiro-shadows-die-twice", "the-last-of-us-part-2-remastered", "marvel-rivals"];
export const ROBUSTNESS_GAMES = ["the-witcher-3-wild-hunt", "assassins-creed-valhalla", "redfall"];

export type NamedConfig = ModelConfig & { name: string };
// Same generation settings across configs: temperature left at the model default, same output cap.
export const CONFIGS: Record<string, NamedConfig> = {
  A: { name: "A", model: "gemini-3.8-flash", thinkingLevel: "medium", maxOutputTokens: 32768 },
  B: { name: "B", model: "gemini-3.5-flash-lite", thinkingLevel: "medium", maxOutputTokens: 32768 },
};

export function loadEnv() {
  const f = path.join(ROOT, ".env.local");
  if (fs.existsSync(f)) process.loadEnvFile(f);
}

export function db() {
  loadEnv();
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

// ---------------------------------------------------------------------------
// Frozen evidence
// ---------------------------------------------------------------------------

export type Snapshot = {
  slug: string;
  takenAt: string;
  hash: string;
  genreKey: string;
  game: Game;
  sources: ReviewSource[];
  critics: CriticSnippet[];
  chars: number;
};

export function snapPath(slug: string) {
  return path.join(SNAP_DIR, `${slug}.json`);
}

/** Reads a game's evidence once, de-duplicates it, hashes it, and stores it. Later runs only read this file. */
export async function takeSnapshot(slug: string, force = false): Promise<Snapshot> {
  if (!force && fs.existsSync(snapPath(slug))) return readJson<Snapshot>(snapPath(slug));
  const supabase = db();
  const { data: game, error } = await supabase.from("games").select("*").eq("slug", slug).single();
  if (error || !game) throw new Error(`Game not found: ${slug}`);
  const { data: sources } = await supabase.from("review_sources").select("*").eq("game_id", game.id);
  const { data: critics } = await supabase
    .from("critic_reviews")
    .select("outlet, snippet")
    .eq("game_id", game.id)
    .order("published_at", { ascending: true })
    .limit(40);
  // Deterministic order so the hash does not depend on database row order.
  const clean = dedupeSources((sources || []) as ReviewSource[]).sort(
    (a, b) => (a.source_type + (a.video_id ?? "") + a.id).localeCompare(b.source_type + (b.video_id ?? "") + b.id)
  );
  const body = { game: game as Game, sources: clean, critics: (critics || []) as CriticSnippet[] };
  const snap: Snapshot = {
    slug,
    takenAt: new Date().toISOString(),
    hash: sha(JSON.stringify(body)).slice(0, 16),
    genreKey: resolveGenreKey(game as Game),
    chars: clean.reduce((n, s) => n + (s.transcript?.length ?? 0), 0),
    ...body,
  };
  writeJson(snapPath(slug), snap);
  return snap;
}

export function loadSnapshot(slug: string): Snapshot {
  if (!fs.existsSync(snapPath(slug))) throw new Error(`No snapshot for ${slug}; run: npx tsx scripts/irr/run.ts snapshot`);
  return readJson<Snapshot>(snapPath(slug));
}

// ---------------------------------------------------------------------------
// Cost meter (reads the ledger, so it survives restarts)
// ---------------------------------------------------------------------------

export function spentUsd(): number {
  if (!fs.existsSync(LEDGER)) return 0;
  return fs
    .readFileSync(LEDGER, "utf8")
    .split("\n")
    .filter(Boolean)
    .reduce((n, line) => n + (JSON.parse(line) as { costUsd: number }).costUsd, 0);
}
export function recordSpend(entry: { phase: string; label: string; costUsd: number }) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.appendFileSync(LEDGER, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
}

/** Run `fn` over `items` with at most `n` in flight. */
export async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const mine = items[i++];
        await fn(mine);
      }
    })
  );
}
