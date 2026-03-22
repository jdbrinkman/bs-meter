import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-sm font-black text-white">
            BS
          </div>
          <span className="text-lg font-bold text-white">BS Meter</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/games"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Browse Games
          </Link>
          <Link
            href="/about"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Methodology
          </Link>
        </nav>
      </div>
    </header>
  );
}
