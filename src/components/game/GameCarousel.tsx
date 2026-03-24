"use client";

import { useRef, useEffect, useState, useCallback } from "react";

type GameCarouselProps = {
  children: React.ReactNode;
};

export function GameCarousel({ children }: GameCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="relative group/carousel">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-on-surface hover:text-primary hover:border-primary/40 transition-all shadow-lg"
          aria-label="Scroll left"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 px-8 scrollbar-hide scroll-smooth"
      >
        {children}
      </div>

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-on-surface hover:text-primary hover:border-primary/40 transition-all shadow-lg"
          aria-label="Scroll right"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}
