import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestYouTubeSources } from "@/lib/pipeline/ingest-youtube";

export const maxDuration = 300;

/** Re-run only the YouTube step for one game (does not touch metadata, Steam, or scores). */
export async function POST(request: NextRequest) {
  if (request.headers.get("x-api-key") !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { gameId } = await request.json();
  if (!gameId) return NextResponse.json({ error: "gameId is required" }, { status: 400 });

  const { data: game } = await createAdminClient().from("games").select("title").eq("id", gameId).single();
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  return NextResponse.json({ title: game.title, ...(await ingestYouTubeSources(gameId, game.title)) });
}
