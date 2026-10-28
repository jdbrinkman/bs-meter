import { createAdminClient } from "@/lib/supabase/admin";

export async function logIngest(
  supabase: ReturnType<typeof createAdminClient>,
  gameId: string,
  source: string,
  status: "ok" | "empty" | "failed" | "skipped",
  detail: string
) {
  const { error } = await supabase.from("ingest_log").insert({ game_id: gameId, source, status, detail });
  if (error) console.warn(`ingest_log write failed: ${error.message}`);
}
