// Player-facing groups for the browse filters. IGDB's raw tags are too coarse ("Adventure" is on 29 of 38
// games) and the scoring profiles are our own categories, so a genre group matches on either: an IGDB genre
// name or a scoring profile key (see game-profiles.ts). A game can be in more than one group. The generic IGDB
// tags "Strategy", "Tactical" and "Puzzle" are left out: they put Mass Effect 3 under strategy and Resident Evil 4 under puzzle.
export type BrowseGroup = { key: string; label: string; match: string[] };

export const GENRE_GROUPS: BrowseGroup[] = [
  { key: "rpg", label: "RPG", match: ["Role-playing (RPG)", "narrative-rpg", "crpg"] },
  {
    key: "action",
    label: "Action",
    match: ["Hack and slash/Beat 'em up", "action-adventure", "soulslike", "soulslike-blended", "roguelike", "roguelike-atmospheric"],
  },
  { key: "shooter", label: "Shooter", match: ["Shooter", "multiplayer-live"] },
  { key: "strategy", label: "Strategy & tactics", match: ["Turn-based strategy (TBS)", "turn-based-tactics"] },
  { key: "platformer-puzzle", label: "Platformer & puzzle", match: ["Platform", "platformer-metroidvania", "puzzle-narrative"] },
];

// Console generations are folded together; Stadia, iOS and the like are left out on purpose.
export const PLATFORM_GROUPS: BrowseGroup[] = [
  { key: "pc", label: "PC", match: ["PC (Microsoft Windows)"] },
  { key: "playstation", label: "PlayStation", match: ["PlayStation 5", "PlayStation 4", "PlayStation 3"] },
  { key: "xbox", label: "Xbox", match: ["Xbox Series X|S", "Xbox One", "Xbox 360"] },
  { key: "nintendo", label: "Nintendo", match: ["Nintendo Switch 2", "Nintendo Switch", "Wii U"] },
  { key: "mac-linux", label: "Mac & Linux", match: ["Mac", "Linux"] },
];
