import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("games")
    .select("slug, title, cover_url, developer, scores(bs_score, verdict)")
    .eq("analysis_status", "complete")
    .ilike("title", `%${q}%`)
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = (data || []).map((game) => ({
    ...game,
    scores: Array.isArray(game.scores) ? game.scores[0] || null : game.scores,
  }));

  return NextResponse.json({ results });
}
