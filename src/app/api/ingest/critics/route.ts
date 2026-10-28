import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestCritics } from "@/lib/pipeline/ingest-critics";

export const maxDuration = 300;

/** Re-run only the critic layer (OpenCritic reviews + written articles) for one game. */
export async function POST(request: NextRequest) {
  if (request.headers.get("x-api-key") !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { gameId } = await request.json();
  if (!gameId) return NextResponse.json({ error: "gameId is required" }, { status: 400 });

  const { data: game } = await createAdminClient().from("games").select("title, opencritic_id").eq("id", gameId).single();
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (!game.opencritic_id) return NextResponse.json({ title: game.title, error: "no OpenCritic ID" }, { status: 422 });

  return NextResponse.json({ title: game.title, ...(await ingestCritics(gameId, game.opencritic_id)) });
}
