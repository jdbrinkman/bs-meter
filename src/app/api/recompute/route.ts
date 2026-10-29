import { NextRequest, NextResponse } from "next/server";
import { recomputeAllV2 } from "@/lib/pipeline/score-v2";

/** Recompute juice/BS indexes and verdicts from stored ratings (no AI calls). */
export async function POST(request: NextRequest) {
  if (request.headers.get("x-api-key") !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await recomputeAllV2());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
