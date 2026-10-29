import { NextRequest, NextResponse } from "next/server";
import { ingestTimeToBeat } from "@/lib/pipeline/ingest-time";

/** Re-run only the time-to-beat step for one game. */
export async function POST(request: NextRequest) {
  if (request.headers.get("x-api-key") !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { gameId } = await request.json();
  if (!gameId) return NextResponse.json({ error: "gameId is required" }, { status: 400 });
  return NextResponse.json(await ingestTimeToBeat(gameId));
}
