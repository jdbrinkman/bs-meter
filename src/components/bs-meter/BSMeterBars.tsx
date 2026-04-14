import { BS_TIERS } from "@/lib/scoring/brackets";

function getSection(bsScore: number) {
  return BS_TIERS.find((s) => bsScore <= s.max) ?? BS_TIERS[3];
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
