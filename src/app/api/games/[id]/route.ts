import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: game, error } = await supabase
    .from("games")
    .select(
      `
      *,
      scores (*),
      signals (*),
      review_sources (id, source_type, channel_name, video_title, url)
    `
    )
    .eq("id", id)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Flatten scores
  const result = {
    ...game,
    scores: Array.isArray(game.scores) ? game.scores[0] || null : game.scores,
  };

  return NextResponse.json({ game: result });
}
