export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { ScoreGauge } from "@/components/bs-meter/ScoreGauge";
import { ScoreBracketBadge } from "@/components/bs-meter/ScoreBracketBadge";
import { PillarBreakdown } from "@/components/bs-meter/PillarBreakdown";
import { SignalList } from "@/components/bs-meter/SignalList";
import { EvidenceCard } from "@/components/bs-meter/EvidenceCard";
import type { BracketKey, GameSignal } from "@/lib/types";

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Hero */}
      <div className="mb-10 flex flex-col gap-8 md:flex-row">
        {/* Cover */}
        <div className="relative aspect-[3/4] w-48 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-800 md:w-56">
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

        {/* Info */}
        <div className="flex-1">
          <h1 className="mb-2 text-3xl font-black text-white">{game.title}</h1>
          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
            {game.developer && <span>{game.developer}</span>}
            {game.publisher && game.publisher !== game.developer && (
              <span>{game.publisher}</span>
            )}
            {game.release_date && (
              <span>
                {new Date(game.release_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                })}
              </span>
            )}
            {game.price_usd && <span>${game.price_usd}</span>}
          </div>

          {game.genres?.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {game.genres.map((genre: string) => (
                <span
                  key={genre}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Score */}
          {score && (
            <div className="flex items-center gap-6">
              <ScoreGauge
                score={score.bs_score}
                bracket={score.bracket as BracketKey}
                size="lg"
              />
              <div>
                <ScoreBracketBadge bracket={score.bracket as BracketKey} />
                {score.confidence && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Confidence: {(score.confidence * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Explainability */}
      {score && (
        <div className="mb-10">
          <EvidenceCard
            summary={score.summary}
            topReasons={score.top_reasons}
          />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-10 md:grid-cols-2">
        {/* Pillar Breakdown */}
        {score && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <PillarBreakdown
              pacing={score.pacing_score}
              bloat={score.bloat_score}
              value={score.value_score}
              grind={score.grind_score}
            />
          </div>
        )}

        {/* Time Data */}
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
              {(game.main_story_hours / game.completionist_hours).toFixed(2)} —{" "}
              {game.completionist_hours / game.main_story_hours > 3
                ? "Significant padding detected"
                : "Reasonable content spread"}
            </p>
          )}
        </div>
      </div>

      {/* Signals */}
      {signals.length > 0 && (
        <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <SignalList signals={signals} />
        </div>
      )}

      {/* Review Sources */}
      {reviewSources.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Sources Analyzed
          </h3>
          <div className="flex flex-wrap gap-2">
            {reviewSources.map(
              (rs: { id: string; channel_name: string | null; url: string | null; video_title: string | null }) => (
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

      {/* OpenCritic Comparison */}
      {score && game.opencritic_score && (
        <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
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
              <p className="text-xs text-zinc-500">BS Meter</p>
              <p className="text-2xl font-bold text-white">
                {score.bs_score}/10
              </p>
              <p className="text-xs text-zinc-500">
                {score.bracket.replace(/-/g, " ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      {score && (
        <div className="mt-10 text-center text-xs text-zinc-600">
          Analyzed {game.analyzed_at ? new Date(game.analyzed_at).toLocaleDateString() : "recently"}{" "}
          using {score.model_version}
          {score.genre_rule_applied &&
            ` with ${score.genre_rule_applied} genre rules`}
        </div>
      )}
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
