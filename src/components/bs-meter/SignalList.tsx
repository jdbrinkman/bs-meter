import { getSignalByKey } from "@/config/signal-taxonomy";
import type { GameSignal } from "@/lib/types";

type SignalListProps = {
  signals: GameSignal[];
};

export function SignalList({ signals }: SignalListProps) {
  const negative = signals.filter((s) => s.polarity === "negative");
  const positive = signals.filter((s) => s.polarity === "positive");

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Detected Signals
      </h3>

      {negative.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-red-400">
            BS Detected
          </h4>
          <div className="flex flex-wrap gap-2">
            {negative
              .sort((a, b) => b.strength - a.strength)
              .map((signal) => {
                const info = getSignalByKey(signal.signal_key);
                return (
                  <SignalChip
                    key={signal.id}
                    label={info?.label || signal.signal_key}
                    strength={signal.strength}
                    polarity="negative"
                    evidence={signal.evidence_text}
                  />
                );
              })}
          </div>
        </div>
      )}

      {positive.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-green-400">
            Respect Detected
          </h4>
          <div className="flex flex-wrap gap-2">
            {positive
              .sort((a, b) => b.strength - a.strength)
              .map((signal) => {
                const info = getSignalByKey(signal.signal_key);
                return (
                  <SignalChip
                    key={signal.id}
                    label={info?.label || signal.signal_key}
                    strength={signal.strength}
                    polarity="positive"
                    evidence={signal.evidence_text}
                  />
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function SignalChip({
  label,
  strength,
  polarity,
  evidence,
}: {
  label: string;
  strength: number;
  polarity: "positive" | "negative";
  evidence: string | null;
}) {
  const bgColor =
    polarity === "negative"
      ? "bg-red-500/10 border-red-500/30 text-red-400"
      : "bg-green-500/10 border-green-500/30 text-green-400";

  return (
    <div className={`group relative rounded-lg border px-3 py-1.5 ${bgColor}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="ml-1.5 text-[10px] opacity-60">
        {strength.toFixed(0)}/10
      </span>
      {evidence && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-zinc-800 p-3 text-xs text-zinc-300 shadow-lg group-hover:block">
          &ldquo;{evidence}&rdquo;
        </div>
      )}
    </div>
  );
}
