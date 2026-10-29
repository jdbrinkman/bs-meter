export const dynamic = "force-dynamic";

import { GameBrowser } from "@/components/game/GameBrowser";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <div>
      <section className="border-b border-outline-variant/10 px-8 pb-6 pt-8">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="mb-2 font-headline text-4xl font-black leading-none tracking-tighter text-on-surface md:text-5xl">
            Is it worth your time and money?
          </h1>
          <p className="font-body text-sm text-on-surface-variant">
            One verdict per game, built from what reviewers and players say about padding, grind, microtransactions, and bugs, set against what the game does well.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-[1440px] px-8 py-12">
        <GameBrowser basePath="/" verdict={params.verdict as string | undefined} genre={params.genre as string | undefined} />
      </div>
    </div>
  );
}
