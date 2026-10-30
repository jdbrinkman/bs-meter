/** Games whose verdict would change if Juice or BS were off by up to 3 points (about the noise of one run). */
import { loadEnv } from "./common";
import { createAdminClient } from "@/lib/supabase/admin";
import { deriveVerdictV2, ratingValue, VERDICTS, type Ratings } from "@/lib/scoring/v2";

async function main() {
  loadEnv();
  const db = createAdminClient();
  const d = Number(process.argv[2] ?? 3);
  const { data } = await db.from("games").select("slug, title, price_usd, current_price_usd, release_date, scores (juice_index, bs_index, verdict_v2, ratings)").order("title");
  const out: string[] = [];
  for (const g of data ?? []) {
    const s = (Array.isArray(g.scores) ? g.scores[0] : g.scores) as { juice_index: number; bs_index: number; verdict_v2: string; ratings: Ratings };
    const v = (j: number, b: number) => deriveVerdictV2({ juice: j, bs: b, broken: ratingValue(s.ratings.broken), priceUsd: g.current_price_usd ?? g.price_usd, releaseDate: g.release_date });
    const alt = new Set<string>();
    for (const dj of [-d, 0, d]) for (const db_ of [-d, 0, d]) { const r = v(s.juice_index + dj, s.bs_index + db_); if (r !== s.verdict_v2) alt.add(VERDICTS[r].label); }
    if (alt.size) out.push(`${g.title} | now ${VERDICTS[s.verdict_v2 as keyof typeof VERDICTS].label} (Juice ${s.juice_index}, BS ${s.bs_index}, $${g.current_price_usd ?? g.price_usd}) | could read: ${[...alt].join(" / ")}`);
  }
  console.log(`${out.length} of ${data?.length} games within ${d} points of a verdict line:\n${out.join("\n")}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
