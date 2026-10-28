import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshMetadata } from "@/lib/pipeline/ingest-metadata";

/** Re-run only the IGDB metadata + cover step for one game. */
export async function POST(request: NextRequest) {
  if (request.headers.get("x-api-key") !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { gameId } = await request.json();
  if (!gameId) return NextResponse.json({ error: "gameId is required" }, { status: 400 });

  const { data: game } = await createAdminClient().from("games").select("title").eq("id", gameId).single();
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const igdb = await refreshMetadata(gameId, game.title);
  return NextResponse.json({ title: game.title, resolved: igdb ? `${igdb.name} (${igdb.slug})` : null });
}
