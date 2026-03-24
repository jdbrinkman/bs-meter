"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ScoreGauge } from "@/components/bs-meter/ScoreGauge";

type SearchResult = {
  slug: string;
  title: string;
  cover_url: string | null;
  developer: string | null;
  scores: { bs_score: number; verdict: string } | null;
};

type SearchOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setHasSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-xl flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-container-high border border-outline-variant/20 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            className="text-primary flex-shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games..."
            className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant font-body text-sm outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Results / States */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="px-4 py-6 text-sm text-on-surface-variant font-body text-center">
              Searching...
            </p>
          ) : hasSearched && results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-on-surface-variant font-body text-center">
              No games found for &ldquo;{query}&rdquo;
            </p>
          ) : results.length > 0 ? (
            <ul>
              {results.map((game) => (
                <li key={game.slug}>
                  <Link
                    href={`/games/${game.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors"
                  >
                    <div className="relative w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container">
                      {game.cover_url ? (
                        <Image
                          src={game.cover_url}
                          alt={game.title}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-[9px] font-label">
                          ?
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-bold font-headline text-on-surface">
                        {game.title}
                      </p>
                      {game.developer && (
                        <p className="truncate text-xs text-on-surface-variant font-body mt-0.5">
                          {game.developer}
                        </p>
                      )}
                    </div>
                    {game.scores?.bs_score != null && (
                      <ScoreGauge bsScore={game.scores.bs_score} size="sm" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-on-surface-variant font-body text-center">
              Start typing to search games...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
