import { NextRequest, NextResponse } from "next/server";
import { recomputeAllV2 } from "@/lib/pipeline/score-v2";

export async function POST(request: NextRequest) {
  if (request.headers.get("x-api-key") !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await recomputeAllV2());
}
