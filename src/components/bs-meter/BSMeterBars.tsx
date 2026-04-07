// 4 sections matching the BSGauge segments exactly
const GAUGE_SECTIONS = [
  { max: 2.5,  label: "No wasted time",   color: "#22C55E" },
  { max: 5,    label: "Minor friction",   color: "#EAB308" },
  { max: 7.5,  label: "Noticeable padding", color: "#F97316" },
  { max: 10,   label: "Significant bloat",  color: "#EF4444" },
];

function getSection(bsScore: number) {
  return GAUGE_SECTIONS.find((s) => bsScore <= s.max) ?? GAUGE_SECTIONS[3];
}

type BSMeterBarsProps = {
  bsScore: number;
};

export function BSMeterBars({ bsScore }: BSMeterBarsProps) {
  const section = getSection(bsScore);

  return (
    <span
      className="text-[10px] font-headline font-semibold uppercase tracking-wide"
      style={{ color: section.color }}
    >
      {section.label}
    </span>
  );
}
