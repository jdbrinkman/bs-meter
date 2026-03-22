import { NextRequest, NextResponse } from "next/server";
import { seedAndProcessGames } from "@/lib/pipeline/process";
import { SEED_GAMES } from "@/config/seed-games";

export const maxDuration = 300; // 5 minutes for Vercel

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  let gamesToProcess;
  if (body.slug) {
    // Process a specific game by slug
    const found = SEED_GAMES.filter((g) => g.slug === body.slug);
    if (found.length === 0) {
      return NextResponse.json({ error: `Game "${body.slug}" not found in seed list` }, { status: 404 });
    }
    gamesToProcess = found;
  } else {
    const limit = body.limit || SEED_GAMES.length;
    gamesToProcess = SEED_GAMES.slice(0, limit);
  }

  try {
    const result = await seedAndProcessGames(gamesToProcess);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
