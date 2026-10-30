/** Old vs new scores after the re-score: reads the pre-re-score backup and the live scores table. Writes tmp/irr/reports/rescore-comparison.md. */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./common";
import { createAdminClient } from "@/lib/supabase/admin";
import { MEASURES, VERDICTS } from "@/lib/scoring/v2";

type ScoreNow = {
  juice_index: number; bs_index: number; verdict_v2: string; provisional: boolean; scoring_version: number; genre_rule_applied: string;
  ratings: Record<string, { status: string }>; issues: { quote_found: boolean | null }[] | null;
};

async function main() {
  loadEnv();
  const db = createAdminClient();
  const dir = path.join(process.cwd(), "tmp", "irr", "backup");
  const file = fs.readdirSync(dir).filter((f) => f.startsWith("scores-")).sort()[0];
  const backup = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as {
    scores: { game_id: string; bs_score: string | null; verdict: string | null; verdict_v2: string | null; juice_index: number | null; bs_index: number | null; scoring_version: number }[];
    games: { id: string; slug: string; title: string }[];
  };
  const old = new Map(backup.scores.map((s) => [s.game_id, s]));
  const { data: games } = await db.from("games").select("id, slug, title, analysis_status, error_log, scores (juice_index, bs_index, verdict_v2, provisional, scoring_version, genre_rule_applied, ratings, issues, run_meta)").order("title");
  const label = (v: string | null | undefined) => (v ? (VERDICTS[v as keyof typeof VERDICTS]?.label ?? v) : "none");
  const rows: string[] = [];
  let same = 0, changed = 0, nov2 = 0, prov = 0, unmatched = 0, quotes = 0;
  const notV3: string[] = [];
  for (const g of games ?? []) {
    const s = (Array.isArray(g.scores) ? g.scores[0] : g.scores) as ScoreNow | null;
    if (!s || s.scoring_version < 3) { notV3.push(g.slug); continue; }
    const o = old.get(g.id);
    const oldV = o?.verdict_v2 ?? null;
    const status = !oldV ? "no earlier verdict" : oldV === s.verdict_v2 ? "same" : "CHANGED";
    if (status === "same") same++; else if (status === "CHANGED") changed++; else nov2++;
    if (s.provisional) prov++;
    for (const i of s.issues ?? []) { if (i.quote_found !== null) quotes++; if (i.quote_found === false) unmatched++; }
    const r = s.ratings;
    const nd = MEASURES.filter((m) => r[m.key]?.status === "not_discussed").map((m) => m.key);
    const na = MEASURES.filter((m) => r[m.key]?.status === "not_applicable").map((m) => m.key);
    rows.push(`| ${g.title} | ${s.genre_rule_applied} | ${oldV ? `${label(oldV)} (${o?.juice_index ?? "?"}/${o?.bs_index ?? "?"} old scale)` : "-"} | **${label(s.verdict_v2)}** | ${s.juice_index} | ${s.bs_index} | ${s.provisional ? "yes" : ""} | ${nd.join(", ")} | ${na.join(", ")} | ${status} |`);
  }
  const md = [
    "# Re-score comparison (rubric v3, prompt v3.1)", "",
    `Games on v3: ${rows.length} of ${games?.length}. Earlier verdict: same ${same}, changed ${changed}, none before ${nov2}. Provisional: ${prov}. Quotes not found in the evidence: ${unmatched} of ${quotes}.`,
    notV3.length ? `NOT on v3: ${notV3.join(", ")}` : "All games are on v3.", "",
    "| Game | Profile | Earlier verdict | New verdict | Juice | BS | Provisional | Not discussed | Not applicable | vs earlier |", "|---|---|---|---|---|---|---|---|---|---|", ...rows, "",
    "Earlier verdict = the previous (rubric v2) verdict from the backup, which used the old 0-5 math, so the old Juice/BS numbers are not comparable to the new ones.",
  ].join("\n");
  fs.writeFileSync(path.join(process.cwd(), "tmp", "irr", "reports", "rescore-comparison.md"), md);
  console.log(md.split("\n").slice(0, 3).join("\n"));
  const pending = (games ?? []).filter((g) => g.analysis_status !== "complete").map((g) => `${g.slug}:${g.analysis_status}`);
  console.log("not complete:", pending.join(", ") || "none", "| error_log set:", (games ?? []).filter((g) => g.error_log).length);
}
main().catch((e) => { console.error(e); process.exit(1); });
