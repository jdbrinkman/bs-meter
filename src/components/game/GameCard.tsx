import Link from "next/link";
import Image from "next/image";
import type { VerdictKey } from "@/lib/types";

// 4-section color system matching the gauge
const SCORE_SECTIONS = [
  { max: 2.5, color: "#22C55E", label: "No wasted time" },
  { max: 5,   color: "#EAB308", label: "Minor friction" },
  { max: 7.5, color: "#F97316", label: "Noticeable padding" },
  { max: 10,  color: "#EF4444", label: "Significant bloat" },
];

function getSection(score: number) {
  return SCORE_SECTIONS.find((s) => score <= s.max) ?? SCORE_SECTIONS[3];
}

type GameCardProps = {
  slug: string;
  title: string;
  coverUrl: string | null;
  developer: string | null;
  genres: string[];
  bsScore: number | null;
  verdict: VerdictKey | null;
};

export function GameCard({ slug, title, coverUrl, bsScore }: GameCardProps) {
  const section = bsScore !== null ? getSection(bsScore) : null;
  const color = section?.color ?? null;

  return (
    <Link
      href={`/games/${slug}`}
      className="group overflow-hidden rounded-2xl bg-surface-container transition-all hover:bg-surface-container-high"
      style={color ? {
        border: `1px solid ${color}50`,
        boxShadow: `0 0 12px ${color}30, 0 0 28px ${color}15`,
      } : {
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-container-high">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-on-surface-variant text-xs font-label">
            No Cover
          </div>
        )}

      </div>

      <div className="px-3 py-2">
        <h3 className="truncate text-sm font-bold font-headline text-on-surface">
          {title}
        </h3>
        {section && (
          <p
            className="mt-0.5 text-[8px] font-headline font-black uppercase tracking-[0.1em]"
            style={{ color: section.color }}
          >
            {section.label}
          </p>
        )}
      </div>
    </Link>
  );
}
