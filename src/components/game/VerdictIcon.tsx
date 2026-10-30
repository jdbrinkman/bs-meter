import type { VerdictKey } from "@/lib/scoring/v2";

const PATHS: Record<VerdictKey, string> = {
  "worth-it": "M5 12l5 5L20 7",
  wait: "M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z",
  "not-yet": "M6 4h12M6 20h12M8 4v3a4 4 0 004 4 4 4 0 004-4V4M8 20v-3a4 4 0 014-4 4 4 0 014 4v3",
  skip: "M6 6l12 12M18 6L6 18",
};

export function VerdictIcon({ kind, size = 28, color }: { kind: VerdictKey; size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[kind]} />
    </svg>
  );
}
