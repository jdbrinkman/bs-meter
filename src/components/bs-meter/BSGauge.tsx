"use client";

import { useState } from "react";
import { getBSScoreLabel } from "@/lib/scoring/brackets";

type BSGaugeProps = {
  score: number;
  showLabel?: boolean;
};

const CX = 140;
const CY = 140;
const OUTER_R = 110;
const INNER_R = 84;
const NEEDLE_R = 78;

function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

function polarToXY(r: number, deg: number) {
  const rad = degToRad(deg);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function fmt(n: number) {
  return n.toFixed(3);
}

// Derive label/color from the same 4-section boundaries used by the visual arcs
function getSegmentForScore(score: number) {
  const idx = Math.min(Math.floor(score / 2.5), 3);
  return SEGMENTS[idx];
}

// score 0 = 180° (left/green), score 10 = 360° (right/red)
function scoreToAngle(score: number) {
  return 180 + (score / 10) * 180;
}

// Build a donut arc segment between two angles
function buildSegment(startDeg: number, endDeg: number): string {
  const so = polarToXY(OUTER_R, startDeg);
  const eo = polarToXY(OUTER_R, endDeg);
  const si = polarToXY(INNER_R, startDeg);
  const ei = polarToXY(INNER_R, endDeg);
  const span = endDeg - startDeg;
  const large = span > 180 ? 1 : 0;

  return [
    `M ${fmt(so.x)} ${fmt(so.y)}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${fmt(eo.x)} ${fmt(eo.y)}`,
    `L ${fmt(ei.x)} ${fmt(ei.y)}`,
    `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${fmt(si.x)} ${fmt(si.y)}`,
    "Z",
  ].join(" ");
}

// 4 equal sections across 180°, each 45°
const SEGMENTS = [
  {
    startDeg: 180, endDeg: 225, color: "#22C55E",
    label: "Respectful",
    desc: "Tight pacing with no filler. Every hour earns its place.",
  },
  {
    startDeg: 225, endDeg: 270, color: "#EAB308",
    label: "Tolerable",
    desc: "Some repetition or padding, but nothing that derails the experience.",
  },
  {
    startDeg: 270, endDeg: 315, color: "#F97316",
    label: "Tedious",
    desc: "Routine filler regularly gets in the way of the good stuff.",
  },
  {
    startDeg: 315, endDeg: 360, color: "#EF4444",
    label: "Exploitative",
    desc: "Deliberately wastes your time through grind, gating, or monetization.",
  },
];

// Small gap between segments (degrees)
const GAP = 1.5;

export function BSGauge({ score, showLabel = true }: BSGaugeProps) {
  const { label, color } = getSegmentForScore(score);
  const needleAngle = scoreToAngle(score);
  const needleTip = polarToXY(NEEDLE_R, needleAngle);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Needle as a thin triangle: tip + two base points perpendicular to angle
  const perpAngle = needleAngle + 90;
  const baseWidth = 3;
  const baseA = polarToXY(baseWidth, perpAngle);
  const baseB = polarToXY(baseWidth, perpAngle + 180);

  const hoveredSeg = hoveredIndex !== null ? SEGMENTS[hoveredIndex] : null;

  return (
    <div className="relative flex flex-col items-center group">

      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 blur-[80px] opacity-20 group-hover:opacity-35 transition-all duration-500 pointer-events-none"
        style={{ backgroundColor: color }}
      />

      {/* SVG gauge */}
      <svg
        viewBox="0 0 280 160"
        width={300}
        height={172}
        role="img"
        aria-label={`BS Meter Score: ${score.toFixed(1)} — ${label}`}
        style={{ overflow: "visible" }}
      >
        {/* ── 4 colored segments ── */}
        {SEGMENTS.map((seg, i) => (
          <path
            key={seg.color}
            d={buildSegment(seg.startDeg + GAP / 2, seg.endDeg - GAP / 2)}
            fill={seg.color}
            opacity={hoveredIndex === null || hoveredIndex === i ? 0.85 : 0.35}
            className="cursor-pointer transition-opacity duration-150"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}

        {/* ── Needle ── */}
        <polygon
          points={`${fmt(needleTip.x)},${fmt(needleTip.y)} ${fmt(baseA.x)},${fmt(baseA.y)} ${fmt(baseB.x)},${fmt(baseB.y)}`}
          fill={color}
          style={{ filter: `drop-shadow(0 0 6px ${color}aa)` }}
        />

        {/* ── Needle pivot circle ── */}
        <circle
          cx={CX}
          cy={CY}
          r={8}
          fill="#1a1919"
          stroke={color}
          strokeWidth={2}
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
        <circle cx={CX} cy={CY} r={3} fill={color} />

      </svg>

      {/* ── Segment tooltip ── */}
      {hoveredSeg && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 rounded-xl bg-surface-container-highest border border-outline-variant/20 p-3 text-center pointer-events-none z-20 shadow-xl">
          <p
            className="text-xs font-bold font-headline uppercase tracking-widest"
            style={{ color: hoveredSeg.color }}
          >
            {hoveredSeg.label}
          </p>
          <p className="text-[11px] text-on-surface-variant font-body mt-1 leading-snug">
            {hoveredSeg.desc}
          </p>
        </div>
      )}

      {/* ── Text below the gauge ── */}
      {showLabel && (
        <div className="flex flex-col items-center mt-2">
          <p
            className="text-2xl font-black font-headline tracking-tight leading-none text-center"
            style={{ color }}
          >
            {label}
          </p>
        </div>
      )}
    </div>
  );
}
