// Expansions, DLC, and spin-offs of games in the catalog. A review of "XCOM 2: War of the Chosen" starts with
// the base game's title, so the YouTube title match needs to know these are different products. They are
// passed to the lookup as extra sibling titles (see ingest-youtube.ts). Add an entry when a game gets
// a notable expansion; check the stored sources for a game with `video_title` containing the expansion name.
export const KNOWN_EXPANSIONS: string[] = [
  "XCOM 2: War of the Chosen",
  "Elden Ring: Shadow of the Erdtree",
  "Elden Ring Nightreign",
  "Diablo IV: Vessel of Hatred",
  "Starfield: Shattered Space",
  "God of War Ragnarök: Valhalla",
  "Assassin's Creed Valhalla: Dawn of Ragnarök",
  "Assassin's Creed Valhalla: Wrath of the Druids",
  "Assassin's Creed Valhalla: The Siege of Paris",
  "Horizon Forbidden West: Burning Shores",
  "Mass Effect 3: Citadel",
  "Mass Effect 3: Leviathan",
  "Dragon Age: Inquisition - Trespasser",
  "Dragon Age: Inquisition - The Descent",
  "Dragon Age: Inquisition - Jaws of Hakkon",
  "The Witcher 3: Blood and Wine",
  "The Witcher 3: Hearts of Stone",
  "Final Fantasy XVI: Echoes of the Fallen",
  "Final Fantasy XVI: The Rising Tide",
  "Resident Evil 4 Remake: Separate Ways",
  "Forspoken: In Tanta We Trust",
];
