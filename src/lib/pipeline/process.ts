import { createAdminClient } from "@/lib/supabase/admin";
import { ingestGameData } from "./ingest";
import { scoreGameV2 } from "./score-v2";

/**
 * Full pipeline: ingest raw data (if not yet done), then score.
 */
export async function processGame(gameId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (gameError || !game) throw new Error(`Game not found: ${gameId}`);

  if (game.analysis_status === "pending") {
    await ingestGameData(gameId, game.title);
  }

  await scoreGameV2(gameId);
}

export async function seedAndProcessGames(
  games: { title: string; slug: string; priceUsd: number; genres: string[]; steamAppId?: number }[]
): Promise<{ success: string[]; failed: string[] }> {
  const supabase = createAdminClient();
  const success: string[] = [];
  const failed: string[] = [];

  for (const seedGame of games) {
    try {
      // Check if game already exists
      const { data: existing } = await supabase
        .from("games")
        .select("id, analysis_status")
        .eq("slug", seedGame.slug)
        .single();

      let gameId: string;

      if (existing) {
        if (existing.analysis_status === "complete") {
          console.log(`Skipping ${seedGame.title} — already analyzed`);
          success.push(seedGame.title);
          continue;
        }
        gameId = existing.id;
      } else {
        // Create the game record
        const { data: created, error } = await supabase
          .from("games")
          .insert({
            slug: seedGame.slug,
            title: seedGame.title,
            price_usd: seedGame.priceUsd,
            genres: seedGame.genres,
            steam_app_id: seedGame.steamAppId ?? null,
          })
          .select("id")
          .single();

        if (error || !created) {
          throw new Error(`Failed to create game: ${error?.message}`);
        }
        gameId = created.id;
      }

      // Process the game
      await processGame(gameId);
      success.push(seedGame.title);

      // Delay between games to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to process ${seedGame.title}:`, error);
      failed.push(seedGame.title);
    }
  }

  return { success, failed };
}
