import { NextRequest, NextResponse } from "next/server";
import { scoreGameV2 } from "@/lib/pipeline/score-v2";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  if (request.headers.get("x-api-key") !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { gameId } = await request.json();
  if (!gameId) return NextResponse.json({ error: "gameId is required" }, { status: 400 });
  try {
    return NextResponse.json({ success: true, ...(await scoreGameV2(gameId)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
