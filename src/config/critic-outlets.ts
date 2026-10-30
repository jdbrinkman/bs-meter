// Outlets whose written reviews we fetch in full, in priority order.
// Chosen for reputation and because their article pages are readable without a login.
// Everything else on OpenCritic is still stored as a score + snippet + link.
// GameSpot (always HTTP 403) and Game Informer (JS-rendered, empty) are left out: 0 of 43 fetches worked.
export const PRIORITY_OUTLETS = [
  "IGN",
  "Eurogamer",
  "PC Gamer",
  "Polygon",
  "GamesRadar+",
  "Rock Paper Shotgun",
  "VG247",
  "Destructoid",
  "PCGamesN",
  "TheGamer",
  "Push Square",
  "Windows Central",
  "Giant Bomb",
  "Kotaku",
  "Shacknews",
  "GameRant",
  "Game Rant",
];

export const MAX_ARTICLES_PER_GAME = 5;
