import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isListed, VERDICT_ORDER } from "@/lib/listing";

/**
 * GET /api/games?genre=&verdict=&sort=verdict|bs|juice|release_date&order=asc|desc&limit=&offset=
 * verdict: worth-it | wait | not-yet | skip. genre: an IGDB genre name.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre");
  const verdict = searchParams.get("verdict");
  const sort = searchParams.get("sort") || "verdict";
  const order = searchParams.get("order");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = createAdminClient().from("games").select("*, scores (*)").in("analysis_status", ["complete", "pending"]);
  if (genre) query = query.contains("genres", [genre]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = { release_date: string | null; analysis_status: string | null; scores: { verdict_v2: string | null; bs_index: number | null; juice_index: number | null } | null };
  let games = (data || []).map((g) => ({ ...g, scores: Array.isArray(g.scores) ? g.scores[0] || null : g.scores })) as Row[];
  games = games.filter((g) => isListed(g.analysis_status, g.scores?.verdict_v2));
  if (verdict) games = games.filter((g) => g.scores?.verdict_v2 === verdict);

  const key = (g: Row): number | string =>
    sort === "bs" ? g.scores?.bs_index ?? 101
    : sort === "juice" ? -(g.scores?.juice_index ?? -1)
    : sort === "release_date" ? g.release_date ?? ""
    : g.scores?.verdict_v2 ? VERDICT_ORDER.indexOf(g.scores.verdict_v2 as (typeof VERDICT_ORDER)[number]) : 99;
  const dir = order === "desc" ? -1 : 1;
  games.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * dir);

  return NextResponse.json({ games: games.slice(offset, offset + limit), count: games.length });
}
