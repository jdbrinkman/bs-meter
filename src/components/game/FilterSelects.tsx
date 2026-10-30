"use client";

import { useRouter } from "next/navigation";

export type SelectOption = { value: string; label: string; href: string; disabled?: boolean };
export type SelectSpec = { id: string; label: string; value: string; options: SelectOption[] };

/** Dropdowns that change the URL on selection; the page itself is rendered on the server from that URL. */
export function FilterSelects({ selects }: { selects: SelectSpec[] }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-end gap-4">
      {selects.map((s) => (
        <div key={s.id} className="flex min-w-[9rem] flex-1 flex-col gap-1 sm:flex-none">
          <label htmlFor={`filter-${s.id}`} className="font-label text-[10px] font-semibold uppercase tracking-widest text-outline">
            {s.label}
          </label>
          <select
            id={`filter-${s.id}`}
            value={s.value}
            onChange={(e) => {
              const option = s.options.find((o) => o.value === e.target.value);
              if (option) router.push(option.href);
            }}
            className="w-full cursor-pointer sm:min-w-[11rem] rounded-full border border-outline-variant bg-surface-container px-3 py-2 sm:px-4 font-label text-xs font-medium text-on-surface transition-colors hover:border-on-surface-variant focus:border-primary focus:outline-none"
          >
            {s.options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
