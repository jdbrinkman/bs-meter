import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveCoverUrl, urlLoads } from "@/lib/api/cover";

export const maxDuration = 120;

// POST — audit every game's cover_url; broken or missing ones are repaired and reported
export async function POST(request: NextRequest) {
  if (request.headers.get("x-api-key") !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: games, error } = await supabase
    .from("games")
    .select("id, title, slug, cover_url, steam_app_id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const repaired: string[] = [];
  const unresolved: string[] = [];

  for (const game of games ?? []) {
    if (await urlLoads(game.cover_url)) continue;
    const url = await resolveCoverUrl({ title: game.title, steamAppId: game.steam_app_id });
    if (url) {
      await supabase.from("games").update({ cover_url: url }).eq("id", game.id);
      repaired.push(game.slug);
    } else {
      unresolved.push(game.slug);
    }
  }

  return NextResponse.json({ checked: games?.length ?? 0, repaired, unresolved });
}
