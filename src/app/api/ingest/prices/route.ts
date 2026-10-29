import { NextRequest, NextResponse } from "next/server";
import { ingestPrices } from "@/lib/pipeline/ingest-prices";

export const maxDuration = 120;

/** Refresh price history from IsThereAnyDeal. Body: { gameIds?: string[] } (omit for all games). */
export async function POST(request: NextRequest) {
  if (request.headers.get("x-api-key") !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    const results = await ingestPrices(body.gameIds);
    return NextResponse.json({ count: results.length, mismatches: results.filter((r) => r.steamMismatch).map((r) => r.title) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
