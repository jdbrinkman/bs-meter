// 4 sections matching the BSGauge segments exactly
const GAUGE_SECTIONS = [
  { max: 2.5,  label: "No wasted time", color: "#22C55E" },
  { max: 5,    label: "Minor friction",         color: "#EAB308" },
  { max: 7.5,  label: "Noticeable padding",     color: "#F97316" },
  { max: 10,   label: "Significant bloat",      color: "#EF4444" },
];

const BAR_HEIGHTS = [4, 6, 9, 12]; // px, shortest to tallest

function getSection(bsScore: number) {
  return GAUGE_SECTIONS.find((s) => bsScore <= s.max) ?? GAUGE_SECTIONS[3];
}

function getActiveBars(bsScore: number) {
  return GAUGE_SECTIONS.findIndex((s) => bsScore <= s.max) + 1;
}

type BSMeterBarsProps = {
  bsScore: number;
};

export function BSMeterBars({ bsScore }: BSMeterBarsProps) {
  const section = getSection(bsScore);
  const activeBars = getActiveBars(bsScore);

  return (
    <div className="flex items-center gap-2.5">
      {/* Bar micrograph — 4 bars */}
      <div className="flex items-end gap-[3px]">
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: h,
              borderRadius: 2,
              backgroundColor: i < activeBars ? section.color : "#3a3a3a",
            }}
          />
        ))}
      </div>

      {/* Descriptor */}
      <span
        className="text-[10px] font-headline font-semibold uppercase tracking-wide"
        style={{ color: section.color }}
      >
        {section.label}
      </span>
    </div>
  );
}
