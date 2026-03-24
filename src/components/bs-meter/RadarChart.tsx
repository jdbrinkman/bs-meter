type RadarChartProps = {
  story_quality: number;
  narrative_investment: number;
  pacing: number;
  combat_repetition: number;
  boss_difficulty: number;
  exploration: number;
  polish_bugs: number;
  ui_controls: number;
  atmospheric_depth: number;
};

const AXES = [
  { key: "story_quality" as const,        label: "STORY QUALITY" },
  { key: "narrative_investment" as const, label: "NARRATIVE" },
  { key: "pacing" as const,               label: "PACING" },
  { key: "combat_repetition" as const,    label: "COMBAT" },
  { key: "boss_difficulty" as const,      label: "BOSS DESIGN" },
  { key: "exploration" as const,          label: "EXPLORATION" },
  { key: "polish_bugs" as const,          label: "POLISH" },
  { key: "ui_controls" as const,          label: "UI & CONTROLS" },
  { key: "atmospheric_depth" as const,    label: "ATMOSPHERE" },
];

const CX = 200;
const CY = 200;
const MAX_R = 150;
const N = AXES.length;

function polarToCartesian(angle: number, r: number) {
  // Start from top (−π/2) going clockwise
  const a = angle - Math.PI / 2;
  return {
    x: CX + r * Math.cos(a),
    y: CY + r * Math.sin(a),
  };
}

function axisAngle(i: number) {
  return (2 * Math.PI * i) / N;
}

export function RadarChart(props: RadarChartProps) {
  const scores = AXES.map((a) => props[a.key]);

  // Build data polygon points
  const dataPoints = scores.map((score, i) => {
    const r = (score / 10) * MAX_R;
    return polarToCartesian(axisAngle(i), r);
  });
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid circle radii (25%, 50%, 75%, 100%)
  const gridRadii = [MAX_R * 0.25, MAX_R * 0.5, MAX_R * 0.75, MAX_R];

  // Axis end points (for lines from center)
  const axisEnds = AXES.map((_, i) => polarToCartesian(axisAngle(i), MAX_R));

  // Label positions (slightly beyond the axis end)
  const labelPositions = AXES.map((_, i) => {
    const pt = polarToCartesian(axisAngle(i), MAX_R + 22);
    return pt;
  });

  return (
    <svg
      viewBox="0 0 400 400"
      className="w-full h-full"
      style={{ overflow: "visible" }}
    >
      {/* Grid circles */}
      {gridRadii.map((r, i) => (
        <circle
          key={i}
          cx={CX}
          cy={CY}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {axisEnds.map((pt, i) => (
        <line
          key={i}
          x1={CX}
          y1={CY}
          x2={pt.x}
          y2={pt.y}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
      ))}

      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="rgba(63,255,139,0.15)"
        stroke="#3fff8b"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data point dots */}
      {dataPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={4} fill="#3fff8b" />
      ))}

      {/* Labels */}
      {AXES.map((axis, i) => {
        const pt = labelPositions[i];
        const angle = axisAngle(i);
        // Determine text-anchor based on horizontal position
        let textAnchor: "start" | "middle" | "end" = "middle";
        const cosA = Math.cos(angle - Math.PI / 2);
        if (cosA > 0.2) textAnchor = "start";
        else if (cosA < -0.2) textAnchor = "end";

        return (
          <text
            key={i}
            x={pt.x}
            y={pt.y}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fill="#adaaaa"
            fontSize={9}
            fontFamily="Space Grotesk, sans-serif"
            fontWeight={600}
            letterSpacing="0.05em"
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
