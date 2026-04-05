export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { DimensionBreakdown } from "@/components/bs-meter/DimensionBreakdown";
import { SignalList } from "@/components/bs-meter/SignalList";
import { BSGauge } from "@/components/bs-meter/BSGauge";
import { getBSScoreLabel } from "@/lib/scoring/brackets";
import type { GameSignal } from "@/lib/types";

type PageParams = Promise<{ slug: string }>;

export default async function GameDetailPage({
  params,
}: {
  params: PageParams;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: game, error } = await supabase
    .from("games")
    .select(
      `
      *,
      scores (*),
      signals (*),
      review_sources (id, source_type, channel_name, video_title, url)
    `
    )
    .eq("slug", slug)
    .single();

  if (error || !game) {
    notFound();
  }

  const score = Array.isArray(game.scores)
    ? game.scores[0] || null
    : game.scores;
  const signals = (game.signals || []) as GameSignal[];
  const reviewSources = game.review_sources || [];

  const bsLabel = score ? getBSScoreLabel(score.bs_score) : null;
  return (
    <div className="min-h-screen bg-background">

      {/* ── HERO ── */}
      <section className="px-6 md:px-8 py-12 md:py-16 border-b border-outline-variant/10 bg-surface-container-low">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">

            {/* Cover image */}
            <div className="relative aspect-[3/4] w-44 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container-high shadow-2xl md:w-52">
              {game.cover_url ? (
                <Image
                  src={game.cover_url}
                  alt={game.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-on-surface-variant text-xs font-label">
                  No Cover
                </div>
              )}
            </div>

            {/* Game info — grows to fill */}
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-6">
              {/* Genre tags */}
              {game.genres?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {game.genres.map((genre: string) => (
                    <span
                      key={genre}
                      className="bg-surface-container-high px-3 py-1 rounded-md text-xs font-label text-on-surface-variant tracking-widest uppercase"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="text-5xl font-black uppercase tracking-tighter text-on-surface font-headline md:text-7xl leading-none">
                {game.title}
              </h1>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-6 border-y border-outline-variant/15 md:grid-cols-4">
                {game.developer && (
                  <div>
                    <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1">
                      Developer
                    </p>
                    <p className="font-headline font-bold text-base text-on-surface">
                      {game.developer}
                    </p>
                  </div>
                )}
                {game.release_date && (
                  <div>
                    <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1">
                      Release Date
                    </p>
                    <p className="font-headline font-bold text-base text-on-surface">
                      {new Date(game.release_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {game.price_usd && (
                  <div>
                    <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1">
                      Price
                    </p>
                    <p className="font-headline font-bold text-base text-primary">
                      ${game.price_usd}
                    </p>
                  </div>
                )}
                {(game.platforms?.length > 0) && (
                  <div>
                    <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1">
                      Platform
                    </p>
                    <p className="font-headline font-bold text-base text-on-surface">
                      {game.platforms?.slice(0, 2).join(" / ")}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* BS Score gauge */}
            {score && bsLabel && (
              <div className="flex flex-col items-center flex-shrink-0 self-center">
                <BSGauge score={score.bs_score} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── THE EVIDENCE ── */}
      {signals.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-6 md:px-8 pt-10 pb-2">
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-6">
            <SignalList signals={signals} />
          </div>
        </section>
      )}

      {/* ── DIMENSION BREAKDOWN ── */}
      {score && (
        <section className="bg-surface-container-low py-16 px-6 md:px-8">
          <div className="mx-auto max-w-[1440px]">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-headline font-bold tracking-tighter text-on-surface mb-3">
                Dimension Breakdown
              </h2>
              <div className="w-20 h-1 bg-primary mx-auto rounded-full" />
            </div>
            <DimensionBreakdown
              story_quality={score.story_quality_score}
              narrative_investment={score.narrative_investment_score}
              pacing={score.pacing_score}
              combat_repetition={score.combat_repetition_score}
              boss_difficulty={score.boss_difficulty_score}
              exploration={score.exploration_score}
              polish_bugs={score.polish_bugs_score}
              ui_controls={score.ui_controls_score}
              atmospheric_depth={score.atmospheric_depth_score}
            />
          </div>
        </section>
      )}

      {/* ── AUDIT REPORT ── */}
      {score && (
        <section className="mx-auto max-w-[1440px] px-6 md:px-8 py-16">
          <div className="mb-10">
            <h2 className="text-4xl md:text-5xl font-headline font-bold tracking-tighter text-on-surface mb-3">
              The Audit Report
            </h2>
            {score.summary && (
              <p className="text-on-surface-variant font-body leading-relaxed max-w-2xl">
                {score.summary}
              </p>
            )}
          </div>

          {/* Top reasons as cards */}
          {score.top_reasons && score.top_reasons.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {score.top_reasons.slice(0, 3).map((reason: string, i: number) => (
                <div
                  key={i}
                  className="p-6 bg-surface-container hover:bg-surface-container-high transition-all rounded-2xl"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mb-4 text-sm font-black font-headline"
                    style={{
                      backgroundColor: `${bsLabel?.color}20`,
                      color: bsLabel?.color,
                    }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-on-surface-variant font-body text-sm leading-relaxed">
                    {reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── BODY ── */}
      <div className="mx-auto max-w-[1440px] px-6 md:px-8 py-12">

        {/* Time to Beat + Steam + OpenCritic */}
        <div className="grid gap-6 md:grid-cols-3">
          {(game.main_story_hours || game.main_extras_hours || game.completionist_hours) && (
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-6 flex flex-col justify-between min-h-[160px]">
              <h3 className="text-xs font-label font-semibold uppercase tracking-widest text-on-surface-variant">
                Time to Beat
              </h3>
              <div className="space-y-3">
                <TimeBar
                  label="Main Story"
                  hours={game.main_story_hours}
                  maxHours={game.completionist_hours || 100}
                  color="#3fff8b"
                />
                <TimeBar
                  label="Main + Extras"
                  hours={game.main_extras_hours}
                  maxHours={game.completionist_hours || 100}
                  color="#45fec9"
                />
                <TimeBar
                  label="Completionist"
                  hours={game.completionist_hours}
                  maxHours={game.completionist_hours || 100}
                  color="#adaaaa"
                />
              </div>
              {game.main_story_hours && game.completionist_hours && (
                <p className="mt-4 text-xs text-outline font-label">
                  Bloat Ratio: {(game.main_story_hours / game.completionist_hours).toFixed(2)}{" "}
                  —{" "}
                  {game.completionist_hours / game.main_story_hours > 3
                    ? "Significant padding detected"
                    : "Reasonable content spread"}
                </p>
              )}
            </div>
          )}

          {game.steam_review_score_desc && (
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-6 flex flex-col justify-between min-h-[160px]">
              <h3 className="text-xs font-label font-semibold uppercase tracking-widest text-on-surface-variant">
                Steam Users
              </h3>
              <div>
                <p className="text-2xl font-black font-headline text-on-surface mt-4">
                  {game.steam_review_score_desc}
                </p>
                {game.steam_total_reviews && (
                  <p className="mt-1 text-xs text-outline font-label">
                    {game.steam_total_reviews.toLocaleString()} reviews
                  </p>
                )}
              </div>
              {game.steam_app_id && (
                <a
                  href={`https://store.steampowered.com/app/${game.steam_app_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-xs font-label text-outline hover:text-on-surface transition-colors"
                >
                  View on Steam →
                </a>
              )}
            </div>
          )}

          {game.opencritic_score && (
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-6 flex flex-col justify-between min-h-[160px]">
              <h3 className="text-xs font-label font-semibold uppercase tracking-widest text-on-surface-variant">
                OpenCritic
              </h3>
              <div>
                <p className="text-5xl font-black font-headline text-on-surface mt-4">
                  {Math.round(game.opencritic_score)}
                </p>
                {game.opencritic_tier && (
                  <p className="mt-1 text-xs text-outline font-label">
                    {game.opencritic_tier}
                  </p>
                )}
              </div>
              <div className="mt-4" />
            </div>
          )}
        </div>


        {/* Review Sources */}
        {reviewSources.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-xs font-label font-semibold uppercase tracking-widest text-on-surface-variant">
              Sources Analyzed
            </h3>
            <div className="flex flex-wrap gap-2">
              {reviewSources.map(
                (rs: {
                  id: string;
                  channel_name: string | null;
                  url: string | null;
                  video_title: string | null;
                }) => (
                  <a
                    key={rs.id}
                    href={rs.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-outline-variant/20 bg-surface-container px-3 py-2 text-xs text-on-surface-variant font-label transition-colors hover:border-outline-variant hover:text-on-surface"
                    title={rs.video_title || undefined}
                  >
                    {rs.channel_name || "Review Source"}
                  </a>
                )
              )}
            </div>
          </div>
        )}

        {/* Footer meta */}
        {score && (
          <div className="mt-10 text-center text-xs text-outline font-label">
            Analyzed{" "}
            {game.analyzed_at
              ? new Date(game.analyzed_at).toLocaleDateString()
              : "recently"}{" "}
            · {score.model_version}
          </div>
        )}
      </div>
    </div>
  );
}

function TimeBar({
  label,
  hours,
  maxHours,
  color,
}: {
  label: string;
  hours: number | null;
  maxHours: number;
  color: string;
}) {
  if (!hours) return null;
  const pct = Math.min(100, (hours / maxHours) * 100);

  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-on-surface font-body">{label}</span>
        <span className="text-on-surface-variant font-label tabular-nums">{hours.toFixed(0)}h</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
