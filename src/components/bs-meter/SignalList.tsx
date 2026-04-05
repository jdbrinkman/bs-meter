import { getSignalByKey } from "@/config/signal-taxonomy";
import type { GameSignal } from "@/lib/types";

type SignalListProps = {
  signals: GameSignal[];
  columns?: boolean;
};

export function SignalList({ signals, columns = false }: SignalListProps) {
  const negative = signals.filter((s) => s.polarity === "negative");
  const positive = signals.filter((s) => s.polarity === "positive");

  return (
    <div className={columns ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}>
      {negative.length > 0 && (
        <div>
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2 mb-3">
            <span className="font-label text-[10px] tracking-widest uppercase text-red-400 font-bold">
              BS Detected
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
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
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2 mb-3">
            <span className="font-label text-[10px] tracking-widest uppercase text-green-400 font-bold">
              Respect Detected
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
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
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      {evidence && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-zinc-800 p-3 text-xs text-zinc-300 shadow-lg group-hover:block">
          &ldquo;{evidence}&rdquo;
        </div>
      )}
    </div>
  );
}
