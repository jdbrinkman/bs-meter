export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { ScoreBracketBadge } from "@/components/bs-meter/ScoreBracketBadge";
import { DimensionBreakdown } from "@/components/bs-meter/DimensionBreakdown";
import { SignalList } from "@/components/bs-meter/SignalList";
import { EvidenceCard } from "@/components/bs-meter/EvidenceCard";
import { getBSScoreLabel, getVerdictInfo } from "@/lib/scoring/brackets";
import type { VerdictKey, GameSignal } from "@/lib/types";

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
  const verdictInfo = score ? getVerdictInfo(score.verdict as VerdictKey) : null;

  return (
    <div className="min-h-screen">
      {/* ── HERO ── */}
      <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-8 md:flex-row md:items-start">

            {/* Cover image */}
            <div className="relative aspect-[3/4] w-44 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-800 shadow-2xl md:w-52">
              {game.cover_url ? (
                <Image
                  src={game.cover_url}
                  alt={game.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-600">
                  No Cover
                </div>
              )}
            </div>

            {/* Game info — grows to fill space */}
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-6">
              {/* Genre tags */}
              {game.genres?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {game.genres.map((genre: string) => (
                    <span
                      key={genre}
                      className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-400"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="text-4xl font-black uppercase tracking-tight text-white md:text-5xl">
                {game.title}
              </h1>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                {game.developer && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Developer
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-white">
                      {game.developer}
                    </p>
                  </div>
                )}
                {game.release_date && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Release Date
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-white">
                      {new Date(game.release_date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {game.price_usd && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Price
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-green-400">
                      ${game.price_usd}
                    </p>
                  </div>
                )}
              </div>

              {/* Verdict badge */}
              {score && (
                <div>
                  <ScoreBracketBadge bracket={score.verdict as VerdictKey} />
                </div>
              )}
            </div>

            {/* BS Score Card */}
            {score && bsLabel && verdictInfo && (
              <div
                className="w-full flex-shrink-0 rounded-2xl border bg-zinc-950 p-6 text-center md:w-56"
                style={{
                  borderColor: `${bsLabel.color}40`,
                  boxShadow: `0 0 48px ${bsLabel.color}18`,
                }}
              >
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  BS Meter Score
                </p>

                {/* Big BS number */}
                <div
                  className="mb-1 text-7xl font-black tabular-nums leading-none"
                  style={{ color: bsLabel.color }}
                >
                  {score.bs_score.toFixed(1)}
                </div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                  /10
                </p>

                <div className="my-4 border-t border-zinc-800" />

                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Friction Level
                </p>
                <p
                  className="mt-1 text-base font-bold"
                  style={{ color: bsLabel.color }}
                >
                  {bsLabel.label}
                </p>

                {/* Confidence */}
                {score.confidence && (
                  <div className="mt-4 rounded-lg bg-zinc-900 px-3 py-2">
                    <p className="text-xs text-zinc-500">Confidence</p>
                    <p className="text-sm font-semibold text-white">
                      {(score.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                )}

                {/* Enjoyment score — secondary */}
                <div className="mt-3 border-t border-zinc-800 pt-3">
                  <p className="text-xs text-zinc-600">Enjoyment Score</p>
                  <p className="text-lg font-bold text-zinc-300">
                    {score.enjoyment_score}
                    <span className="text-xs font-normal text-zinc-600">/100</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="mx-auto max-w-5xl px-4 py-12">

        {/* Why This Score */}
        {score && (
          <div className="mb-10">
            <EvidenceCard
              summary={score.summary}
              topReasons={score.top_reasons}
            />
          </div>
        )}

        {/* Two-column: Dimensions + Time */}
        <div className="grid gap-8 md:grid-cols-2">
          {score && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
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
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Time to Beat
            </h3>
            <div className="space-y-3">
              <TimeBar
                label="Main Story"
                hours={game.main_story_hours}
                maxHours={game.completionist_hours || 100}
                color="bg-blue-500"
              />
              <TimeBar
                label="Main + Extras"
                hours={game.main_extras_hours}
                maxHours={game.completionist_hours || 100}
                color="bg-green-500"
              />
              <TimeBar
                label="Completionist"
                hours={game.completionist_hours}
                maxHours={game.completionist_hours || 100}
                color="bg-orange-500"
              />
            </div>
            {game.main_story_hours && game.completionist_hours && (
              <p className="mt-4 text-xs text-zinc-500">
                Bloat Ratio:{" "}
                {(game.main_story_hours / game.completionist_hours).toFixed(2)}{" "}
                —{" "}
                {game.completionist_hours / game.main_story_hours > 3
                  ? "Significant padding detected"
                  : "Reasonable content spread"}
              </p>
            )}
          </div>
        </div>

        {/* Signals */}
        {signals.length > 0 && (
          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <SignalList signals={signals} />
          </div>
        )}

        {/* Review Sources */}
        {reviewSources.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
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
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
                    title={rs.video_title || undefined}
                  >
                    {rs.channel_name || "Review Source"}
                  </a>
                )
              )}
            </div>
          </div>
        )}

        {/* Critics vs BS Meter */}
        {score && game.opencritic_score && (
          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Critics vs BS Meter
            </h3>
            <div className="flex items-center gap-8">
              <div>
                <p className="text-xs text-zinc-500">OpenCritic</p>
                <p className="text-2xl font-bold text-white">
                  {game.opencritic_score}/100
                </p>
                <p className="text-xs text-zinc-500">{game.opencritic_tier}</p>
              </div>
              <div className="text-2xl text-zinc-700">vs</div>
              <div>
                <p className="text-xs text-zinc-500">BS Meter Enjoyment</p>
                <p className="text-2xl font-bold text-white">
                  {score.enjoyment_score}/100
                </p>
                <p className="text-xs text-zinc-500">
                  {score.verdict.replace(/-/g, " ")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer meta */}
        {score && (
          <div className="mt-10 text-center text-xs text-zinc-600">
            Analyzed{" "}
            {game.analyzed_at
              ? new Date(game.analyzed_at).toLocaleDateString()
              : "recently"}{" "}
            using {score.model_version}
            {score.genre_rule_applied &&
              ` · ${score.genre_rule_applied} genre weights`}
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
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-zinc-300">{label}</span>
        <span className="text-zinc-500">{hours.toFixed(0)}h</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
