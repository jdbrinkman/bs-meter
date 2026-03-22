import type { HLTBResult } from "@/lib/types";

// HowLongToBeat actively blocks scrapers and both the `howlongtobeat`
// and `howlongtobeat-js` npm packages are broken (404 / apiKey errors).
// For MVP, we rely on manual seed data in src/config/seed-games.ts.
// This function is kept as a stub for future API integration.

export async function searchHLTB(title: string): Promise<HLTBResult | null> {
  // HLTB has no public API and actively blocks automated requests.
  // Return null to fall through to seed data in the ingest pipeline.
  console.log(`HLTB: Using seed data fallback for "${title}"`);
  return null;
}
