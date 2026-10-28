import { createAdminClient } from "@/lib/supabase/admin";
import { fetchOpenCriticReviews } from "@/lib/api/opencritic-reviews";
import { fetchArticleText } from "@/lib/api/article";
import { PRIORITY_OUTLETS, MAX_ARTICLES_PER_GAME } from "@/config/critic-outlets";
import { logIngest } from "./ingest-log";

/**
 * Stores OpenCritic reviews (outlet, score, snippet, link) and fetches the full text of
 * the best written reviews so the scoring prompt can read them like transcripts.
 */
export async function ingestCritics(gameId: string, opencriticId: number) {
  const supabase = createAdminClient();
  try {
    const reviews = await fetchOpenCriticReviews(opencriticId, 2);
    if (!reviews.length) {
      await logIngest(supabase, gameId, "opencritic:reviews", "empty", "no reviews returned");
      return { reviews: 0, articles: 0 };
    }

    const { error } = await supabase.from("critic_reviews").upsert(
      reviews.map((r) => ({
        game_id: gameId,
        opencritic_review_id: r.id,
        outlet: r.outlet,
        author: r.author,
        score: r.score,
        snippet: r.snippet,
        url: r.url,
        published_at: r.publishedAt,
        fetched_at: new Date().toISOString(),
      })),
      { onConflict: "game_id,opencritic_review_id" }
    );
    if (error) {
      await logIngest(supabase, gameId, "opencritic:reviews", "failed", `could not save: ${error.message}`);
      return { reviews: 0, articles: 0 };
    }
    await logIngest(supabase, gameId, "opencritic:reviews", "ok", `${reviews.length} reviews stored`);

    // One review per priority outlet, in priority order, until we have enough readable articles.
    const byOutlet = new Map(reviews.filter((r) => r.url).map((r) => [r.outlet.toLowerCase(), r]));
    const candidates = PRIORITY_OUTLETS.map((o) => byOutlet.get(o.toLowerCase())).filter((r): r is NonNullable<typeof r> => !!r);

    let articles = 0;
    for (const review of candidates) {
      if (articles >= MAX_ARTICLES_PER_GAME) break;
      const result = await fetchArticleText(review.url!);
      await logIngest(supabase, gameId, `article:${review.outlet}`, result.status, `${review.url} — ${result.detail}`);
      if (result.status !== "ok") continue;

      const { error: saveError } = await supabase.from("review_sources").upsert(
        {
          game_id: gameId,
          source_type: "article",
          channel_name: review.outlet,
          video_id: review.id,
          video_title: `${review.outlet} review`,
          transcript: result.text,
          url: review.url,
          published_at: review.publishedAt,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "game_id,source_type,video_id" }
      );
      if (saveError) await logIngest(supabase, gameId, `article:${review.outlet}`, "failed", `could not save: ${saveError.message}`);
      else articles++;
      await new Promise((r) => setTimeout(r, 500));
    }
    return { reviews: reviews.length, articles };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await logIngest(supabase, gameId, "opencritic:reviews", "failed", msg.slice(0, 300));
    return { reviews: 0, articles: 0, error: msg };
  }
}
