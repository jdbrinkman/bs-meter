export const dynamic = "force-dynamic";

import { GameBrowser } from "@/components/game/GameBrowser";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function GamesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-[1440px] px-8 py-12">
      <h1 className="mb-2 font-headline text-4xl font-black tracking-tighter text-on-surface">Browse Games</h1>
      <GameBrowser basePath="/games" params={params} showCount />
    </div>
  );
}
