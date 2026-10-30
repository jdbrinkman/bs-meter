"use client";

import { VIEW_COOKIE, type ViewKey } from "@/lib/browse-view";

const ICONS: Record<ViewKey, string> = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  list: "M4 6h16M4 12h16M4 18h16",
};

function rememberView(v: ViewKey) {
  try {
    document.cookie = `${VIEW_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Cookies blocked: the URL still carries the choice.
  }
}

/** Grid / List switch. The link carries the choice in the URL; the cookie only remembers it for the next visit. */
export function ViewToggle({ current, hrefs }: { current: ViewKey; hrefs: Record<ViewKey, string> }) {
  return (
    <div role="group" aria-label="View" className="inline-flex overflow-hidden rounded-full border border-outline-variant">
      {(["grid", "list"] as const).map((v) => (
        <a
          key={v}
          href={hrefs[v]}
          onClick={() => rememberView(v)}
          aria-current={current === v ? "true" : undefined}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 font-label text-xs font-medium transition-colors ${
            current === v ? "bg-surface-container-highest text-on-surface" : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ICONS[v]} />
          </svg>
          {v === "grid" ? "Grid" : "List"}
        </a>
      ))}
    </div>
  );
}
