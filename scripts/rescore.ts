/**
 * One-off re-score of the live games with the v3 rubric (scoreGameV2: the same code the site uses).
 *
 *   npx tsx scripts/rescore.ts backup                    save every score row and game status to tmp/irr/backup/
 *   npx tsx scripts/rescore.ts run [--games a,b] [--concurrency 3] [--cap 3.5] [--force]
 *
 * Safeguards:
 *  - Resumable: games already at scoring_version 3 are skipped (unless --force).
 *  - Stops launching new games once this run's spend reaches --cap (USD).
 *  - The public site (still on the old UI) lists only games with analysis_status = 'complete', and scoreGameV2
 *    flips the status while it works or on failure. After each game this puts the status, analyzed_at and
 *    error_log back to what they were, so a failed game does not vanish from the public site and a game that
 *    was unlisted (pending) stays unlisted until the new UI is deployed.
 * Cost is read back from run_meta.tokens; failed attempts are not counted.
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv, pool, recordSpend, writeJson } from "./irr/common";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreGameV2 } from "@/lib/pipeline/score-v2";
import { costUsd } from "@/lib/ai/gemini";

const OUT = path.join(process.cwd(), "tmp", "irr");
const BACKUP_DIR = path.join(OUT, "backup");

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

type GameRow = { id: string; slug: string; title: string; analysis_status: string | null; analyzed_at: string | null; error_log: string | null };

async function backup() {
  const db = createAdminClient();
  const { data: scores, error } = await db.from("scores").select("*");
  if (error) throw new Error(error.message);
  const { data: games, error: gErr } = await db.from("games").select("id, slug, title, analysis_status, analyzed_at, error_log");
  if (gErr) throw new Error(gErr.message);
  const file = path.join(BACKUP_DIR, `scores-${new Date().toISOString().slice(0, 10)}.json`);
  if (fs.existsSync(file)) throw new Error(`${file} already exists; refusing to overwrite a backup`);
  writeJson(file, { takenAt: new Date().toISOString(), scores, games });
  console.log(`backup: ${scores?.length} score rows, ${games?.length} games -> ${file}`);
}

async function run() {
  const db = createAdminClient();
  const cap = Number(arg("cap", "3.5"));
  const conc = Number(arg("concurrency", "3"));
  const only = arg("games")?.split(",").filter(Boolean);
  const { data: games, error } = await db.from("games").select("id, slug, title, analysis_status, analyzed_at, error_log").order("slug");
  if (error) throw new Error(error.message);
  const { data: scores } = await db.from("scores").select("game_id, scoring_version");
  const version = new Map((scores ?? []).map((s) => [s.game_id as string, s.scoring_version as number | null]));

  let list = (games ?? []) as GameRow[];
  if (only) list = list.filter((g) => only.includes(g.slug));
  if (!flag("force")) list = list.filter((g) => (version.get(g.id) ?? 0) < 3);
  console.log(`${list.length} games to score, concurrency ${conc}, cost cap $${cap}`);

  let spent = 0;
  let stopped = false;
  const failures: { slug: string; error: string }[] = [];

  await pool(list, conc, async (g) => {
    if (spent >= cap) {
      if (!stopped) console.log(`STOP: cost cap $${cap} reached; remaining games skipped`);
      stopped = true;
      return;
    }
    const started = Date.now();
    let line: string;
    try {
      const r = await scoreGameV2(g.id);
      const { data: row } = await db.from("scores").select("run_meta, provisional").eq("game_id", g.id).single();
      const m = (row?.run_meta ?? {}) as { model_returned?: string; input_tokens?: number; output_tokens?: number; thinking_tokens?: number };
      const cost = costUsd(m.model_returned ?? "gemini-3.8-flash", m.input_tokens ?? 0, (m.output_tokens ?? 0) + (m.thinking_tokens ?? 0));
      spent += cost;
      recordSpend({ phase: "rescore", label: g.slug, costUsd: cost });
      line = `ok   ${g.slug}  juice ${r.juice} bs ${r.bs} ${r.verdict}${row?.provisional ? " (provisional)" : ""}  $${cost.toFixed(3)}  ${Math.round((Date.now() - started) / 1000)}s`;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      failures.push({ slug: g.slug, error: message });
      line = `FAIL ${g.slug}  ${message.slice(0, 200)}`;
    }
    // Put the public-facing status back (see the header comment). A game that was complete and scored fine keeps
    // its new analyzed_at, since it really was re-analyzed.
    const keepNewTime = g.analysis_status === "complete" && line.startsWith("ok");
    await db
      .from("games")
      .update({ analysis_status: g.analysis_status, error_log: g.error_log, ...(keepNewTime ? {} : { analyzed_at: g.analyzed_at }) })
      .eq("id", g.id);
    console.log(`${line}  (run spend $${spent.toFixed(2)})`);
  });

  console.log(`done: spent $${spent.toFixed(2)}, ${failures.length} failed${failures.length ? ": " + failures.map((f) => f.slug).join(", ") : ""}`);
}

async function main() {
  loadEnv();
  const cmd = process.argv[2];
  if (cmd === "backup") await backup();
  else if (cmd === "run") await run();
  else console.log("commands: backup | run");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
