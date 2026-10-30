// Offline test of HLTB entry matching, using real entries returned on 2026-10-28.
import { pickHltbEntry } from "../src/lib/api/hltb.ts";
const e = (id, name, releaseYear, similarity = 1) => ({ id, name, releaseYear, similarity, mainTime: 3600 });
const cases = [
  ["Resident Evil 4 Remake", 2023, [e(108881, "Resident Evil 4", 2023), e(137868, "Resident Evil 4 - Separate Ways", 2023, 0.9), e(1, "Resident Evil 4", 2005)], 108881],
  ["Resident Evil 4 Remake", 2023, [e(1, "Resident Evil 4", 2005)], null],
  ["Hades", 2020, [e(10, "Hades II", 2025, 0.9), e(11, "Hades", 2020)], 11],
  ["Hades II", 2025, [e(11, "Hades", 2020, 0.9), e(10, "Hades II", 2025)], 10],
  ["The Witcher 3: Wild Hunt", 2015, [e(10270, "The Witcher 3: Wild Hunt", 2015), e(2, "The Witcher 3: Wild Hunt - Blood and Wine", 2016, 0.9)], 10270],
  ["Mass Effect 3", 2012, [e(5, "Mass Effect: Andromeda", 2017, 0.8)], null],
  ["The Last of Us Part II Remastered", 2024, [e(7, "The Last of Us Part II", 2020, 0.95)], null],
  ["Final Fantasy VII Rebirth", 2024, [e(9, "Final Fantasy VII Rebirth", 2024)], 9],
  ["Baldur's Gate 3", null, [e(3, "Baldur's Gate 3", 2023)], 3],
];
let bad = 0;
for (const [title, year, entries, want] of cases) {
  const got = pickHltbEntry(title, year, entries)?.id ?? null;
  if (got !== want) bad++;
  console.log(`${got === want ? "ok  " : "BAD "} ${title} (${year}) -> ${got} (wanted ${want})`);
}
process.exit(bad ? 1 : 0);
