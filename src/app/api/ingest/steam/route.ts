import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestSteam } from "@/lib/pipeline/ingest-steam";

export const maxDuration = 120;

/** Re-run only the Steam step (store facts + review sample) for one game. */
export async function POST(request: NextRequest) {
  if (request.headers.get("x-api-key") !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { gameId, reviews } = await request.json();
  if (!gameId) return NextResponse.json({ error: "gameId is required" }, { status: 400 });

  const { data: game } = await createAdminClient().from("games").select("title").eq("id", gameId).single();
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  return NextResponse.json({ title: game.title, ...(await ingestSteam(gameId, game.title, { reviews: reviews !== false })) });
}
