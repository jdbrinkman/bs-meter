import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);

  const genre = searchParams.get("genre");
  const bracket = searchParams.get("bracket");
  const sort = searchParams.get("sort") || "bs_score";
  const order = searchParams.get("order") || "desc";
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Build query — join games with scores
  let query = supabase
    .from("games")
    .select(
      `
      *,
      scores (*)
    `
    )
    .eq("analysis_status", "complete")
    .range(offset, offset + limit - 1);

  // Genre filter
  if (genre) {
    query = query.contains("genres", [genre]);
  }

  // Bracket filter (requires join)
  if (bracket) {
    query = query.eq("scores.bracket", bracket);
  }

  // Sorting
  if (sort === "bs_score") {
    query = query.order("analyzed_at", {
      ascending: order === "asc",
    });
  } else if (sort === "release_date") {
    query = query.order("release_date", {
      ascending: order === "asc",
    });
  } else {
    query = query.order("analyzed_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten scores from array to single object
  const games = (data || []).map((game) => ({
    ...game,
    scores: Array.isArray(game.scores) ? game.scores[0] || null : game.scores,
  }));

  return NextResponse.json({ games });
}

export async function POST(request: NextRequest) {
  // Protected: require admin API key
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, slug, priceUsd, genres } = body;

  if (!title || !slug) {
    return NextResponse.json(
      { error: "title and slug are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("games")
    .insert({
      title,
      slug,
      price_usd: priceUsd || null,
      genres: genres || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ game: data }, { status: 201 });
}
