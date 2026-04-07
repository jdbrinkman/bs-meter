import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestGameData } from "@/lib/pipeline/ingest";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { gameId } = body;

  if (!gameId) {
    return NextResponse.json({ error: "gameId is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: game, error } = await supabase
    .from("games")
    .select("title, analysis_status")
    .eq("id", gameId)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Reset status to ingesting so ingestGameData runs, but preserve existing scores
  // by NOT setting status to "pending" (which would re-trigger full processGame ingest logic)
  try {
    await ingestGameData(gameId, game.title);

    // Restore whatever status the game had before (don't flip it back to pending)
    await supabase
      .from("games")
      .update({ analysis_status: game.analysis_status })
      .eq("id", gameId);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
