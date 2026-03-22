type EvidenceCardProps = {
  summary: string;
  topReasons: string[];
};

export function EvidenceCard({ summary, topReasons }: EvidenceCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Why This Score?
      </h3>
      <p className="mb-4 text-base text-white">{summary}</p>
      <ul className="space-y-2">
        {topReasons.map((reason, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
            <span className="mt-0.5 text-zinc-600">&bull;</span>
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
