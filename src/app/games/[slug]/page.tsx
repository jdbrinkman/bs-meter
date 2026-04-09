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

      {/* ── HEADER — flat, open ── */}
      <div className="mx-auto max-w-7xl px-6 md:px-12 pt-10 pb-8">
        {game.genres?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {game.genres.map((genre: string) => (
              <span
                key={genre}
                className="bg-surface-container-high px-3 py-1 rounded-md text-[10px] font-label text-on-surface-variant tracking-widest uppercase"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-on-surface font-headline leading-none mb-6">
          {game.title}
        </h1>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {game.developer && (
            <div className="flex flex-col">
              <span className="text-[9px] font-label uppercase tracking-widest text-outline mb-1">Developer</span>
              <span className="font-headline font-semibold text-sm text-on-surface">{game.developer}</span>
            </div>
          )}
          {game.release_date && (
            <div className="flex flex-col">
              <span className="text-[9px] font-label uppercase tracking-widest text-outline mb-1">Release</span>
              <span className="font-headline font-semibold text-sm text-on-surface">
                {new Date(game.release_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          )}
          {game.price_usd && (
            <div className="flex flex-col">
              <span className="text-[9px] font-label uppercase tracking-widest text-outline mb-1">Price</span>
              <span className="font-headline font-semibold text-sm text-on-surface">${game.price_usd}</span>
            </div>
          )}
          {game.platforms?.length > 0 && (
            <div className="flex flex-col">
              <span className="text-[9px] font-label uppercase tracking-widest text-outline mb-1">Platform</span>
              <span className="font-headline font-semibold text-sm text-on-surface">{game.platforms.slice(0, 2).join(" / ")}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── FORENSIC GRID ── */}
      <section className="mx-auto max-w-7xl px-6 md:px-12 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left col: sticky cover art */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="relative overflow-hidden rounded-xl bg-surface-container aspect-[3/4]">
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
              <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
            </div>
          </div>

          {/* Right col: gauge + evidence */}
          <div className="lg:col-span-8 space-y-6">

            {/* Gauge card */}
            {score && bsLabel && (
              <div className="relative overflow-visible rounded-xl bg-surface-container-low border border-outline-variant/10 p-8">
                {/* Ambient glow */}
                <div
                  className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"
                  style={{ backgroundColor: `${bsLabel.color}15` }}
                />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  {/* Gauge with label above and below */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <p className="text-[10px] font-label uppercase tracking-[0.2em] text-on-surface-variant mb-2">
                      BS Meter Score
                    </p>
                    <BSGauge score={score.bs_score} />
                  </div>

                  {/* Top reasons */}
                  {score.top_reasons && score.top_reasons.length > 0 && (
                    <div className="flex-1 space-y-3">
                      {score.top_reasons.slice(0, 3).map((reason: string, i: number) => (
                        <div key={i} className="flex gap-3 items-start">
                          <div
                            className="w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-black font-headline mt-0.5"
                            style={{ backgroundColor: `${bsLabel.color}20`, color: bsLabel.color }}
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
                </div>
              </div>
            )}

            {/* Evidence — 2 columns */}
            {signals.length > 0 && (
              <div className="rounded-xl bg-surface-container-low border border-outline-variant/10 p-6">
                <h3 className="font-headline text-lg font-bold tracking-tight uppercase mb-5">
                  The Evidence
                </h3>
                <SignalList signals={signals} columns={true} />
              </div>
            )}

          </div>
        </div>
      </section>

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
