import type { VerdictKey } from "@/lib/types";

export type VerdictInfo = {
  key: VerdictKey;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  range: string;
  bsDescription: string;
};

export const VERDICTS: Record<VerdictKey, VerdictInfo> = {
  "must-play": {
    key: "must-play",
    label: "Must Play",
    color: "#3B82F6",
    bgColor: "bg-blue-500",
    textColor: "text-blue-500",
    range: "88-100",
    bsDescription: "Exceptional across the board",
  },
  buy: {
    key: "buy",
    label: "Buy",
    color: "#22C55E",
    bgColor: "bg-green-500",
    textColor: "text-green-500",
    range: "78-87",
    bsDescription: "Highly recommended",
  },
  "worth-playing": {
    key: "worth-playing",
    label: "Worth Playing",
    color: "#EAB308",
    bgColor: "bg-yellow-500",
    textColor: "text-yellow-500",
    range: "65-77",
    bsDescription: "Good with caveats",
  },
  mixed: {
    key: "mixed",
    label: "Mixed",
    color: "#F97316",
    bgColor: "bg-orange-500",
    textColor: "text-orange-500",
    range: "40-64",
    bsDescription: "Significant issues",
  },
  skip: {
    key: "skip",
    label: "Skip",
    color: "#EF4444",
    bgColor: "bg-red-500",
    textColor: "text-red-500",
    range: "0-39",
    bsDescription: "Not recommended",
  },
};

export function classifyVerdict(enjoymentScore: number, narrativeCap: boolean): VerdictKey {
  // Apply narrative cap: pure gameplay / PvPvE extraction capped at 87 (max "buy" tier)
  const capped = narrativeCap ? Math.min(enjoymentScore, 87) : enjoymentScore;

  if (capped >= 88) return "must-play";
  if (capped >= 78) return "buy";
  if (capped >= 65) return "worth-playing";
  if (capped >= 40) return "mixed";
  return "skip";
}

export function getVerdictInfo(key: VerdictKey): VerdictInfo {
  return VERDICTS[key];
}

// BS Score tiers — single source of truth for labels, colors, and boundaries
export const BS_TIERS: { max: number; label: string; color: string; desc: string }[] = [
  { max: 2.5,  label: "Respectful",   color: "#22C55E", desc: "Tight pacing with no filler. Every hour earns its place." },
  { max: 5,    label: "Tolerable",    color: "#EAB308", desc: "Some repetition or padding, but nothing that derails the experience." },
  { max: 7.5,  label: "Tedious",      color: "#F97316", desc: "Routine filler regularly gets in the way of the good stuff." },
  { max: 10,   label: "Exploitative", color: "#EF4444", desc: "Deliberately wastes your time through grind, gating, or monetization." },
];

/** @deprecated Use BS_TIERS instead */
export const BS_SCORE_LABELS = BS_TIERS;

export function getBSScoreLabel(bsScore: number): { label: string; color: string } {
  for (const tier of BS_TIERS) {
    if (bsScore <= tier.max) return { label: tier.label, color: tier.color };
  }
  return { label: "Exploitative", color: "#EF4444" };
}
