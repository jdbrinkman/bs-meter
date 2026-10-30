/** Flattens every saved run into tmp/irr/ratings.csv (one row per run x measure) and runs.csv (one row per run). */
import fs from "node:fs";
import path from "node:path";
import { OUT, RUN_DIR } from "./common";
import { loadRuns } from "./analyze";

const q = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
const ratings = ["phase,kind,game,config,model_returned,variant,run,measure,status,rating,basis,source,reason,issue_ids"];
const runs = ["phase,kind,game,config,model_returned,thinking,variant,run,ok,juice,bs,verdict,provisional,observations,cost_usd,input_tokens,output_tokens,thinking_tokens,evidence_hash,prompt_version,rubric_version,schema_version,error"];
for (const phase of fs.readdirSync(RUN_DIR)) {
  for (const r of loadRuns(phase)) {
    const all = [...r.attempts.extract, ...r.attempts.rate, ...r.attempts.classify];
    const sum = (f: (a: (typeof all)[number]) => number) => all.reduce((n, a) => n + f(a), 0);
    runs.push([phase, r.kind, r.slug, r.config.name, r.modelsReturned.join("+"), r.config.thinkingLevel, r.variant, r.run, r.ok, r.indexes?.juice ?? "", r.indexes?.bs ?? "", r.indexes?.verdict ?? "", r.indexes?.provisional ?? "", r.observations?.length ?? "", r.costUsd.toFixed(4), sum((a) => a.inputTokens), sum((a) => a.outputTokens), sum((a) => a.thinkingTokens), r.evidenceHash, r.versions.prompt, r.versions.rubric, r.versions.schema, q(r.error)].join(","));
    if (r.analysis)
      for (const [m, v] of Object.entries(r.analysis.ratings))
        ratings.push([phase, r.kind, r.slug, r.config.name, r.modelsReturned.join("+"), r.variant, r.run, m, v.status, v.rating ?? "", v.basis, q(v.source), q(v.reason), q(v.issue_ids.join(" "))].join(","));
  }
}
fs.writeFileSync(path.join(OUT, "ratings.csv"), ratings.join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "runs.csv"), runs.join("\n") + "\n");
console.log(`ratings.csv ${ratings.length - 1} rows, runs.csv ${runs.length - 1} rows`);
