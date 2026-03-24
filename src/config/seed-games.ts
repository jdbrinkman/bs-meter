export type SeedGame = {
  title: string;
  slug: string;
  priceUsd: number;
  genres: string[];
  genreKey: string;
  // Manual HLTB data (hours) as fallback when scraping fails
  hltb?: {
    mainStory: number;
    mainExtras: number;
    completionist: number;
  };
};

export const SEED_GAMES: SeedGame[] = [
  // Lean Masterpiece candidates
  {
    title: "Hades",
    slug: "hades",
    priceUsd: 24.99,
    genres: ["Roguelike", "Action"],
    genreKey: "roguelike",
    hltb: { mainStory: 22, mainExtras: 45, completionist: 97 },
  },
  {
    title: "Resident Evil 4 Remake",
    slug: "resident-evil-4-remake",
    priceUsd: 59.99,
    genres: ["Horror", "Action"],
    genreKey: "horror-action",
    hltb: { mainStory: 16, mainExtras: 22, completionist: 55 },
  },
  {
    title: "Elden Ring",
    slug: "elden-ring",
    priceUsd: 59.99,
    genres: ["Souls-like", "Open World", "RPG"],
    genreKey: "souls-like",
    hltb: { mainStory: 57, mainExtras: 98, completionist: 133 },
  },
  {
    title: "God of War Ragnarök",
    slug: "god-of-war-ragnarok",
    priceUsd: 69.99,
    genres: ["Action", "Adventure"],
    genreKey: "horror-action",
    hltb: { mainStory: 26, mainExtras: 36, completionist: 54 },
  },
  {
    title: "Baldur's Gate 3",
    slug: "baldurs-gate-3",
    priceUsd: 59.99,
    genres: ["RPG", "CRPG"],
    genreKey: "open-world-rpg",
    hltb: { mainStory: 55, mainExtras: 100, completionist: 159 },
  },
  {
    title: "The Last of Us Part II Remastered",
    slug: "the-last-of-us-part-2-remastered",
    priceUsd: 49.99,
    genres: ["Action", "Adventure", "Horror"],
    genreKey: "horror-action",
    hltb: { mainStory: 24, mainExtras: 29, completionist: 42 },
  },
  // High Signal candidates
  {
    title: "The Witcher 3: Wild Hunt",
    slug: "the-witcher-3-wild-hunt",
    priceUsd: 39.99,
    genres: ["Open World", "RPG"],
    genreKey: "open-world-rpg",
    hltb: { mainStory: 52, mainExtras: 105, completionist: 173 },
  },
  {
    title: "Hollow Knight",
    slug: "hollow-knight",
    priceUsd: 14.99,
    genres: ["Metroidvania", "Indie"],
    genreKey: "metroidvania",
    hltb: { mainStory: 27, mainExtras: 39, completionist: 63 },
  },
  {
    title: "Sekiro: Shadows Die Twice",
    slug: "sekiro-shadows-die-twice",
    priceUsd: 59.99,
    genres: ["Souls-like", "Action"],
    genreKey: "souls-like",
    hltb: { mainStory: 30, mainExtras: 40, completionist: 75 },
  },
  {
    title: "Dead Space Remake",
    slug: "dead-space-remake",
    priceUsd: 59.99,
    genres: ["Horror", "Action"],
    genreKey: "horror-action",
    hltb: { mainStory: 11, mainExtras: 15, completionist: 23 },
  },
  // Fair Trade candidates
  {
    title: "Final Fantasy XVI",
    slug: "final-fantasy-xvi",
    priceUsd: 69.99,
    genres: ["JRPG", "Action"],
    genreKey: "jrpg",
    hltb: { mainStory: 35, mainExtras: 55, completionist: 82 },
  },
  {
    title: "Horizon Forbidden West",
    slug: "horizon-forbidden-west",
    priceUsd: 59.99,
    genres: ["Open World", "RPG", "Action"],
    genreKey: "open-world-rpg",
    hltb: { mainStory: 29, mainExtras: 49, completionist: 80 },
  },
  {
    title: "Starfield",
    slug: "starfield",
    priceUsd: 69.99,
    genres: ["Open World", "RPG", "Sci-Fi"],
    genreKey: "open-world-rpg",
    hltb: { mainStory: 30, mainExtras: 64, completionist: 139 },
  },
  // Content Sludge candidates
  {
    title: "Final Fantasy VII Rebirth",
    slug: "final-fantasy-vii-rebirth",
    priceUsd: 69.99,
    genres: ["JRPG", "Action"],
    genreKey: "jrpg",
    hltb: { mainStory: 42, mainExtras: 66, completionist: 100 },
  },
  {
    title: "Skull and Bones",
    slug: "skull-and-bones",
    priceUsd: 69.99,
    genres: ["Open World", "Action"],
    genreKey: "open-world-rpg",
    hltb: { mainStory: 17, mainExtras: 31, completionist: 64 },
  },
  {
    title: "Forspoken",
    slug: "forspoken",
    priceUsd: 69.99,
    genres: ["Open World", "Action", "RPG"],
    genreKey: "open-world-rpg",
    hltb: { mainStory: 17, mainExtras: 30, completionist: 52 },
  },
  {
    title: "Mass Effect 3",
    slug: "mass-effect-3",
    priceUsd: 59.99,
    genres: ["RPG", "Sci-Fi", "Action"],
    genreKey: "open-world-rpg",
    hltb: { mainStory: 17, mainExtras: 35, completionist: 55 },
  },
  {
    title: "Mass Effect: Andromeda",
    slug: "mass-effect-andromeda",
    priceUsd: 19.99,
    genres: ["Open World", "RPG", "Sci-Fi", "Action"],
    genreKey: "open-world-rpg",
    hltb: { mainStory: 18, mainExtras: 45, completionist: 90 },
  },
  {
    title: "Diablo IV",
    slug: "diablo-iv",
    priceUsd: 69.99,
    genres: ["Action RPG", "Looter"],
    genreKey: "open-world-rpg",
    hltb: { mainStory: 22, mainExtras: 50, completionist: 150 },
  },
  {
    title: "Dragon Age: Inquisition",
    slug: "dragon-age-inquisition",
    priceUsd: 19.99,
    genres: ["Open World", "RPG"],
    genreKey: "open-world-rpg",
    hltb: { mainStory: 45, mainExtras: 80, completionist: 125 },
  },
  // Clock Puncher candidates
  {
    title: "Assassin's Creed Valhalla",
    slug: "assassins-creed-valhalla",
    priceUsd: 59.99,
    genres: ["Open World", "RPG", "Action"],
    genreKey: "open-world-rpg",
    hltb: { mainStory: 60, mainExtras: 97, completionist: 148 },
  },
  {
    title: "Gotham Knights",
    slug: "gotham-knights",
    priceUsd: 69.99,
    genres: ["Open World", "Action", "RPG"],
    genreKey: "open-world-rpg",
    hltb: { mainStory: 17, mainExtras: 28, completionist: 42 },
  },
  {
    title: "Redfall",
    slug: "redfall",
    priceUsd: 69.99,
    genres: ["FPS", "Open World"],
    genreKey: "fps-shooter",
    hltb: { mainStory: 12, mainExtras: 18, completionist: 30 },
  },
  {
    title: "Hades II",
    slug: "hades-2",
    priceUsd: 29.99,
    genres: ["Roguelike", "Action"],
    genreKey: "roguelike",
    hltb: { mainStory: 25, mainExtras: 55, completionist: 100 },
  },
  {
    title: "Crimson Desert",
    slug: "crimson-desert",
    priceUsd: 49.99,
    genres: ["Open World", "Action", "RPG"],
    genreKey: "open-world-rpg",
  },
  {
    title: "Ghost of Yōtei",
    slug: "ghost-of-yotei",
    priceUsd: 69.99,
    genres: ["Open World", "Action", "Adventure"],
    genreKey: "open-world-rpg",
  },
  {
    title: "Mio: Memories in Orbit",
    slug: "mio-memories-in-orbit",
    priceUsd: 29.99,
    genres: ["Adventure", "Narrative"],
    genreKey: "puzzle-narrative",
  },
  {
    title: "Hollow Knight: Silksong",
    slug: "hollow-knight-silksong",
    priceUsd: 19.99,
    genres: ["Metroidvania", "Indie", "Platformer"],
    genreKey: "platformer-metroidvania",
    hltb: { mainStory: 25, mainExtras: 40, completionist: 65 },
  },
];
