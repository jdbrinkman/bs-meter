import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-background py-12 px-8 border-t border-outline-variant/10">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-xl font-black text-primary tracking-tighter font-headline">
          BS METER
        </div>
        <p className="text-on-surface-variant text-sm font-label">
          © {new Date().getFullYear()} THE DIGITAL AUDITOR. ALL DATA ANALYZED BY AI.
        </p>
        <div className="flex gap-6">
          <Link
            href="/about"
            className="text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest text-[10px] font-label"
          >
            Methodology
          </Link>
          <Link
            href="/games"
            className="text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest text-[10px] font-label"
          >
            Browse
          </Link>
        </div>
      </div>
    </footer>
  );
}
