"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchOverlay } from "@/components/search/SearchOverlay";

const NAV_LINKS = [
  { href: "/", label: "Browse" },
  { href: "/about", label: "Methodology" },
];

export function Header() {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
    <header className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-xl border-b border-outline-variant/10">
      <div className="flex justify-between items-center px-8 h-20 max-w-[1440px] mx-auto">
        {/* Logo */}
        <Link href="/" className="text-2xl font-black text-primary tracking-tighter font-headline">
          BS METER
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`font-headline tracking-tight text-sm transition-colors ${
                  isActive
                    ? "text-primary font-bold border-b-2 border-primary pb-1"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Icons */}
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-lg"
            onClick={() => setIsSearchOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </div>
    </header>
    <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
