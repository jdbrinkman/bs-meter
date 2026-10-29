# Genre profiles

Status: implemented 2026-10-28 for review. The weights and the per-game assignments are **hand-set starting points, not validated**; the reliability tests include a sensitivity check on them.

## What a profile does

A profile does two things for a game:
1. **Sets the Juice weights** (`JUICE_WEIGHTS` in `src/lib/scoring/v2.ts`): how much each of the six Juice measures counts toward that game's Juice index. A measure marked not applicable is dropped and the rest are re-weighted.
2. **Gives the rater a short note** (`GENRE_RULES` in `src/config/genre-weights.ts`) on what this kind of game is trying to be, plus designed exemptions (for example, a roguelike's run loop is not Repetition). The notes no longer tell the rater what to penalize; the measure rubrics and decision order do that.

The BS index does not use profiles: it takes the worst three squeeze measures for every game.

## How a game gets its profile

1. **Explicit assignment** in `src/config/game-profiles.ts` (`PROFILE_BY_SLUG`), reviewed by Jordan. All 38 current games are assigned.
2. **Fallback** for a new game with no entry: `mapIGDBGenreToKey` guesses from IGDB tags and a few titles, and logs a warning. It cannot detect roguelikes or live-service games, so those need an explicit entry.

Why not the tags alone: IGDB has no roguelike tag, tags change over time (re-scoring would have moved Resident Evil 4 Remake from action-horror to puzzle-narrative), and 23 of 35 games used to land on one profile.

## Juice weights

Order: story, gameplay, world, presentation, challenge, staying power. Weights are relative (they are normalized), so only the ratios matter.

| Profile | Story | Gameplay | World | Presentation | Challenge | Staying |
|---|---|---|---|---|---|---|
| Narrative RPG | 3 | 2 | 1.5 | 1 | 0.5 | 0.5 |
| Soulslike | 0.5 | 3 | 2 | 1 | 3 | 1 |
| Soulslike with story | 1.5 | 3 | 2 | 1 | 2.5 | 1 |
| Action Adventure | 2 | 3 | 2 | 1 | 1 | 0.5 |
| Roguelike | 0.5 | 3 | 1 | 1 | 1.5 | 3 |
| Roguelike (story-driven) | 1.5 | 3 | 2 | 1 | 1.5 | 2.5 |
| Platformer / Metroidvania | 0.5 | 3 | 2 | 1.5 | 1.5 | 1 |
| Puzzle / Narrative | 2 | 2.5 | 2 | 1 | 1.5 | 0.5 |
| Pure Gameplay | 0 | 3 | 1 | 1 | 1.5 | 2 |
| Narrative Open World | 3 | 2 | 2 | 1.5 | 0.5 | 0.5 |
| Action Horror | 1.5 | 3 | 2 | 1.5 | 1 | 0.5 |
| CRPG / Tactical RPG | 3 | 2 | 1.5 | 0.5 | 1 | 1 |
| Multiplayer / live service | 0 | 3 | 1 | 1 | 2 | 3 |
| Turn-based tactics | 1.5 | 3 | 1 | 1 | 2.5 | 1.5 |
| General (default) | 1.5 | 3 | 2 | 1 | 1 | 1 |

Changes from the old table: Content is gone (its weight moved mostly into Story, because side-quest writing now lives there, and Presentation); Replay is now Staying power; the extraction profile became the broader Multiplayer / live service; Turn-based tactics is new.

## Assignments

| Profile | Games |
|---|---|
| Narrative RPG | The Witcher 3, Dragon Age: Inquisition, Final Fantasy VII Rebirth, Final Fantasy XVI, Mass Effect 3, Mass Effect: Andromeda, Starfield, The Blood of Dawnwalker |
| Action Adventure | Assassin's Creed Valhalla, Crimson Desert, Forspoken, Ghost of Yotei, God of War Ragnarök, Gotham Knights, Horizon Forbidden West, Onimusha, Pragmata, Redfall, The Last of Us Part II |
| Soulslike | Elden Ring, Mortal Shell II, Sekiro |
| Action Horror | Resident Evil 4 Remake, Dead Space Remake |
| Roguelike (story-driven) | Hades, Hades II, Saros |
| Platformer / Metroidvania | Hollow Knight, Silksong, Mio |
| Multiplayer / live service | Marvel Rivals, Overwatch 2, Skull and Bones |
| Turn-based tactics | XCOM 2, Final Fantasy Tactics: The Ivalice Chronicles |
| Puzzle / Narrative | Lorelei and the Laser Eyes |
| CRPG | Baldur's Gate 3 |
| General | Diablo IV |

### Judgment calls to confirm
- **Skull and Bones** as live service (online, little campaign story). If you see it as a story game, move it to Action Adventure.
- **Diablo IV** as General (loot-driven action RPG with a campaign and seasons); no profile fits it well.
- **God of War Ragnarök** as Action Adventure rather than Narrative RPG (story and gameplay are both heavy; the old mapper had it as Narrative RPG).
- **Mass Effect: Andromeda, Starfield, Dragon Age: Inquisition** as Narrative RPG (story-led BioWare/Bethesda RPGs).
- **Onimusha** as Action Adventure (the other option is Soulslike with story).
- **Redfall** as Action Adventure (a co-op shooter; Multiplayer / live service is the other option).
- **Ghost of Yotei** as Action Adventure (the other option is Narrative Open World, whose weights give Story more).
- **Unused profiles** kept for future games: Roguelike (plain), Soulslike with story, Pure Gameplay, Narrative Open World.

## Still open
- Juice weights are unvalidated; the reliability tests should include a check on how much a verdict moves if weights shift.
- Stored ratings for the 23 scored games use the old Content and Replay keys. They are replaced at the re-score; `/api/recompute-v2` on old ratings would drop those two measures and re-weight the rest.
