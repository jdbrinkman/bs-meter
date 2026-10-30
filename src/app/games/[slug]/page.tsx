export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { VerdictIcon } from "@/components/game/VerdictIcon";
import { JUICE, SQUEEZE, VERDICTS, bsColor, displayIndex, normalizeRating, type MeasureDef, type Ratings } from "@/lib/scoring/v2";

type PageParams = Promise<{ slug: string }>;

export default async function GameDetailPage({ params }: { params: PageParams }) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: game, error } = await supabase
    .from("games")
    .select(`*, scores (*), review_sources (id, source_type, channel_name, video_title, url), critic_reviews (id, outlet, score, url, published_at)`)
    .eq("slug", slug)
    .single();

  if (error || !game) notFound();

  const score = Array.isArray(game.scores) ? game.scores[0] || null : game.scores;
  const reviewSources = game.review_sources || [];
  const criticReviews = ((game.critic_reviews || []) as { id: string; outlet: string; score: number | null; url: string | null }[]).filter(
    (c) => c.url
  );
  const videos = reviewSources.filter((r: { source_type: string }) => r.source_type === "youtube");
  const articles = reviewSources.filter((r: { source_type: string }) => r.source_type === "article");
  const ratings = (score?.ratings ?? null) as Ratings | null;
  const verdict = score?.verdict_v2 ? VERDICTS[score.verdict_v2 as keyof typeof VERDICTS] : null;
  const bs: number | null = score?.bs_index ?? null;
  const juice: number | null = score?.juice_index ?? null;

  const meta = [
    game.genres?.[0],
    priceLabel(game),
    game.release_date ? new Date(game.release_date).getFullYear() : null,
  ].filter(Boolean);

  const hours = [
    game.main_story_hours && `Story ${Math.round(game.main_story_hours)}h`,
    game.completionist_hours && `Everything ${Math.round(game.completionist_hours)}h`,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-8 sm:flex-row">
          <div className="relative aspect-[3/4] w-40 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container sm:w-56">
            {game.cover_url && (
              <Image src={game.cover_url} alt={game.title} fill className="object-cover" priority sizes="224px" />
            )}
          </div>

          <div className="flex-1">
            <h1 className="font-headline text-3xl font-black tracking-tight text-on-surface md:text-5xl">
              {game.title}
            </h1>
            <p className="mt-1 mb-6 font-label text-sm text-on-surface-variant">
              {[...meta, ...hours].join(" · ")}
            </p>

            {/* 1 — THE ANSWER */}
            {verdict && score?.verdict_v2 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: `${verdict.color}1f` }}>
                <div className="flex items-center gap-3">
                  <VerdictIcon kind={score.verdict_v2} size={40} color={verdict.color} />
                  <span className="font-headline text-4xl font-black md:text-5xl" style={{ color: verdict.color }}>
                    {verdict.label}
                  </span>
                </div>
                {score.headline && (
                  <p className="mt-4 font-body text-base leading-relaxed text-on-surface">{score.headline}</p>
                )}
              </div>
            )}

            {/* 2 — TWO NUMBERS */}
            {bs !== null && juice !== null && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <IndexCard label="Juice · higher is better" value={juice} color="#22C55E" />
                <IndexCard label="BS · lower is better" value={bs} color={bsColor(bs)} />
              </div>
            )}
          </div>
        </div>

        {/* 3 — ALL 12 MEASURES, every game, reason inline */}
        {ratings && (
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            <MeasureColumn title="The juice" color="#22C55E" defs={JUICE} ratings={ratings} />
            <MeasureColumn title="The BS" color="#EF4444" defs={SQUEEZE} ratings={ratings} />
          </div>
        )}
        {score?.provisional && (
          <p className="mt-4 font-label text-xs text-on-surface-variant">
            Provisional: the sources we read don&apos;t cover several measures, so treat these numbers as a rough guide.
          </p>
        )}
        {score?.rough_launch && (
          <p className="mt-4 font-label text-xs text-on-surface-variant">
            Rough at launch. Ratings reflect the game as it is today.
          </p>
        )}

        <div className="mt-10 divide-y divide-outline-variant/15 border-t border-outline-variant/15">
          {(game.steam_review_score_desc || game.opencritic_score) && (
            <Collapsible title="Steam and OpenCritic">
              <div className="flex flex-wrap gap-8 font-label text-sm text-on-surface-variant">
                {game.steam_review_score_desc && (
                  <p>
                    Steam: <span className="text-on-surface">{game.steam_review_score_desc}</span>
                    {game.steam_total_reviews ? ` (${game.steam_total_reviews.toLocaleString()} reviews)` : ""}
                  </p>
                )}
                {game.opencritic_score && (
                  <p>
                    OpenCritic: <span className="text-on-surface">{Math.round(game.opencritic_score)}</span>
                    {game.opencritic_tier ? ` (${game.opencritic_tier})` : ""}
                  </p>
                )}
              </div>
            </Collapsible>
          )}

          {(videos.length > 0 || articles.length > 0 || criticReviews.length > 0) && (
            <Collapsible title="Sources">
              <div className="space-y-6">
                {videos.length > 0 && <SourceGroup label="Video reviews we read" items={videos.map((v: SourceRow) => ({ key: v.id, text: v.channel_name || "Review", url: v.url, title: v.video_title }))} />}
                {articles.length > 0 && <SourceGroup label="Written reviews we read" items={articles.map((a: SourceRow) => ({ key: a.id, text: a.channel_name || "Review", url: a.url, title: a.video_title }))} />}
                {criticReviews.length > 0 && (
                  <SourceGroup
                    label={`Critic reviews on OpenCritic (${criticReviews.length})`}
                    items={criticReviews
                      .slice()
                      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
                      .map((c) => ({ key: c.id, text: c.score != null ? `${c.outlet} ${Math.round(c.score)}` : c.outlet, url: c.url, title: null }))}
                  />
                )}
              </div>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  );
}

type SourceRow = { id: string; channel_name: string | null; url: string | null; video_title: string | null };

function SourceGroup({ label, items }: { label: string; items: { key: string; text: string; url: string | null; title: string | null }[] }) {
  return (
    <div>
      <p className="mb-2 font-label text-[11px] uppercase tracking-widest text-on-surface-variant">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <a
            key={i.key}
            href={i.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-surface-container px-3 py-2 font-label text-xs text-on-surface-variant hover:text-on-surface"
            title={i.title || undefined}
          >
            {i.text}
          </a>
        ))}
      </div>
    </div>
  );
}

type PriceGame = {
  price_usd: number | string | null;
  current_price_usd: number | string | null;
  price_source: string | null;
  price_history: { historyLow?: { all: number | null } } | null;
};

function priceLabel(g: PriceGame): string | null {
  const list = g.price_usd != null ? Number(g.price_usd) : null;
  const now = g.current_price_usd != null ? Number(g.current_price_usd) : null;
  const low = g.price_history?.historyLow?.all ?? null;
  if (now == null) return list != null ? `$${list} list price` : null;
  const main = now === 0 ? "Free" : list != null && now < list ? `$${now} (was $${list})` : `$${now}`;
  return low != null && now > 0 && low < now * 0.8 ? `${main}, all-time low $${low}` : main;
}

function IndexCard({ label, value, color }: { label: string; value: number; color: string }) {
  // Five-level ratings do not support one-point precision, so show the nearest 5.
  const shown = displayIndex(value) ?? value;
  return (
    <div className="rounded-xl bg-surface-container p-4">
      <p className="font-label text-[11px] text-on-surface-variant">{label}</p>
      <p className="mt-1 font-headline text-3xl font-black text-on-surface">
        <span className="text-sm font-medium text-on-surface-variant">about </span>
        {shown}
        <span className="text-sm font-medium text-on-surface-variant"> / 100</span>
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-surface-container-highest">
        <div className="h-full rounded-full" style={{ width: `${shown}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function MeasureColumn({ title, color, defs, ratings }: { title: string; color: string; defs: MeasureDef[]; ratings: Ratings }) {
  return (
    <div className="rounded-2xl bg-surface-container p-5">
      <h2 className="mb-4 font-headline text-sm font-black uppercase tracking-widest" style={{ color }}>
        {title}
      </h2>
      <ul className="space-y-4">
        {defs.map((d) => {
          const r = normalizeRating(ratings[d.key]);
          if (!r) return null;
          const value = r.status === "rated" ? r.rating : null;
          const empty = value == null;
          return (
            <li key={d.key} className={empty ? "opacity-50" : ""}>
              <div className="flex items-center justify-between">
                <span className="font-headline text-base font-bold text-on-surface">{d.label}</span>
                {empty ? (
                  <span className="font-label text-xs text-on-surface-variant">
                    {r.status === "not_applicable" ? "N/A" : "Not discussed"}
                  </span>
                ) : (
                  <span className="flex gap-1" role="img" aria-label={`${value} of 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: n <= value ? color : "#333" }} />
                    ))}
                  </span>
                )}
              </div>
              <p className="mt-1 font-body text-sm text-on-surface-variant">
                {r.status === "not_applicable"
                  ? "Doesn't apply to this kind of game."
                  : r.status === "not_discussed"
                    ? "The sources we read don't cover this."
                    : r.reason}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between font-label text-sm text-on-surface-variant hover:text-on-surface">
        {title}
        <span className="transition-transform group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="pt-6">{children}</div>
    </details>
  );
}
