import type { BracketKey } from "@/lib/types";

export type BracketInfo = {
  key: BracketKey;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  range: string;
};

export const BRACKETS: Record<BracketKey, BracketInfo> = {
  "lean-masterpiece": {
    key: "lean-masterpiece",
    label: "Lean Masterpiece",
    color: "#3B82F6",
    bgColor: "bg-blue-500",
    textColor: "text-blue-500",
    range: "9-10",
  },
  "high-signal": {
    key: "high-signal",
    label: "High Signal",
    color: "#22C55E",
    bgColor: "bg-green-500",
    textColor: "text-green-500",
    range: "7-8",
  },
  "fair-trade": {
    key: "fair-trade",
    label: "The Fair Trade",
    color: "#EAB308",
    bgColor: "bg-yellow-500",
    textColor: "text-yellow-500",
    range: "5-6",
  },
  "content-sludge": {
    key: "content-sludge",
    label: "Content Sludge",
    color: "#F97316",
    bgColor: "bg-orange-500",
    textColor: "text-orange-500",
    range: "3-4",
  },
  "clock-puncher": {
    key: "clock-puncher",
    label: "Clock Puncher",
    color: "#EF4444",
    bgColor: "bg-red-500",
    textColor: "text-red-500",
    range: "1-2",
  },
};

export function classifyBracket(score: number): BracketKey {
  if (score >= 9) return "lean-masterpiece";
  if (score >= 7) return "high-signal";
  if (score >= 5) return "fair-trade";
  if (score >= 3) return "content-sludge";
  return "clock-puncher";
}

export function getBracketInfo(key: BracketKey): BracketInfo {
  return BRACKETS[key];
}
