// Offline test of the IGDB candidate picker, using the real candidates IGDB returned on 2026-10-28.
import { pickIGDBCandidate } from "../src/lib/api/igdb.ts";
const c = (id, name, type, rc) => ({ id, name, slug: String(id), game_type: { type }, rating_count: rc });
const cases = [
  ["The Witcher 3: Wild Hunt", [c(141472, "The Witcher 3: Wild Hunt + Dark Souls III", "Bundle"), c(1942, "The Witcher 3: Wild Hunt", "Main Game", 1500), c(22439, "The Witcher 3: Wild Hunt - Game of the Year Edition", "Bundle"), c(415005, "The Witcher 3: Wild Hunt Remastered", "Update")], 1942],
  ["Hollow Knight", [c(365702, "Hollow Knight", "Mod"), c(14593, "Hollow Knight", "Main Game", 2266), c(372563, "Hollow Knight Silksong", "Main Game"), c(115289, "Hollow Knight: Silksong", "Main Game", 521)], 14593],
  ["Hollow Knight: Silksong", [c(372563, "Hollow Knight Silksong", "Main Game"), c(115289, "Hollow Knight: Silksong", "Main Game", 521), c(381684, "Hollow Knight: Silksong - Sea of Sorrow", "Update")], 115289],
  ["Overwatch 2", [c(261349, "Overwatch 2: Invasion Bundle", "Pack / Addon"), c(228002, "Overwatch 2: Season 2 - Greek Mythology", "Season")], null],
  ["Elden Ring", [c(1, "Elden Ring: Shadow of the Erdtree", "Expansion"), c(2, "Elden Ring", "Main Game", 3000)], 2],
];
let bad = 0;
for (const [title, cands, want] of cases) {
  const got = pickIGDBCandidate(title, cands)?.id ?? null;
  if (got !== want) bad++;
  console.log(`${got === want ? "ok  " : "BAD "} ${title} -> ${got} (wanted ${want})`);
}
process.exit(bad ? 1 : 0);
