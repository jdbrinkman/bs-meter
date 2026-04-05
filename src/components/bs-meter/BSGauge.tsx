import { getBSScoreLabel } from "@/lib/scoring/brackets";

type BSGaugeProps = {
  score: number;
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
  { startDeg: 180, endDeg: 225, color: "#22C55E" }, // Green   — 0–2.5
  { startDeg: 225, endDeg: 270, color: "#EAB308" }, // Yellow  — 2.5–5
  { startDeg: 270, endDeg: 315, color: "#F97316" }, // Orange  — 5–7.5
  { startDeg: 315, endDeg: 360, color: "#EF4444" }, // Red     — 7.5–10
];

// Small gap between segments (degrees)
const GAP = 1.5;

export function BSGauge({ score }: BSGaugeProps) {
  const { label, color } = getBSScoreLabel(score);
  const needleAngle = scoreToAngle(score);
  const needleTip = polarToXY(NEEDLE_R, needleAngle);

  // Needle as a thin triangle: tip + two base points perpendicular to angle
  const perpAngle = needleAngle + 90;
  const baseWidth = 3;
  const baseA = polarToXY(baseWidth, perpAngle);
  const baseB = polarToXY(baseWidth, perpAngle + 180);

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
        {SEGMENTS.map((seg) => (
          <path
            key={seg.color}
            d={buildSegment(seg.startDeg + GAP / 2, seg.endDeg - GAP / 2)}
            fill={seg.color}
            opacity={0.85}
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

        {/* ── "BS METER SCORE" label ── */}
        <text
          x={CX}
          y={20}
          textAnchor="middle"
          fill="#adaaaa"
          fontSize={8}
          fontFamily="var(--font-label), Inter, sans-serif"
          fontWeight={600}
          letterSpacing="0.2em"
        >
          BS METER SCORE
        </text>
      </svg>

      {/* ── Text below the gauge ── */}
      <div className="flex flex-col items-center mt-2">
        <p
          className="text-2xl font-black font-headline tracking-tight leading-none text-center"
          style={{ color }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
