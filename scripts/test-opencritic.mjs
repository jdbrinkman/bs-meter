// Offline test of the OpenCritic candidate picker using real candidates seen on 2026-10-28.
import { pickOpenCriticCandidate } from "../src/lib/api/opencritic.ts";
const c = (id, name, dist, date, n) => ({ id, name, dist, firstReleaseDate: date, numReviews: n });
const cases = [
  ["Resident Evil 4 Remake", 2023, [c(3227, "Resident Evil 4", 0.24, "2016-08-30", 49), c(12198, "Resident Evil 4 VR", 0.33, "2021-10-21", 27), c(14200, "Resident Evil 4 (2023)", 0.38, "2023-03-24", 217)], 14200],
  ["Mass Effect 3", 2012, [c(1547, "Mass Effect Andromeda", 0.5, "2017-03-21", 180), c(11290, "Mass Effect Legendary Edition", 0.61, "2021-05-14", 123)], null],
  ["Mortal Shell II", 2026, [c(20988, "Mortal Shell II", 0, "2026-08-20", 115), c(10021, "Mortal Shell", 0.19, "2020-08-18", 127)], 20988],
  ["Hades", 2020, [c(10181, "Hades", 0, "2020-09-17", 150), c(16683, "Hades II", 0.17, "2024-05-06", 60)], 10181],
  ["Hades II", 2025, [c(10181, "Hades", 0.17, "2020-09-17", 150), c(16683, "Hades II", 0, "2024-05-06", 60)], 16683],
  ["The Witcher 3: Wild Hunt", 2015, [c(463, "The Witcher 3: Wild Hunt", 0, "2015-05-19", 181)], 463],
];
let bad = 0;
for (const [title, year, cands, want] of cases) {
  const got = pickOpenCriticCandidate(title, year, cands)?.id ?? null;
  if (got !== want) bad++;
  console.log(`${got === want ? "ok  " : "BAD "} ${title} -> ${got} (wanted ${want})`);
}
process.exit(bad ? 1 : 0);
