// Offline test of ITAD price summarizing, using the real response shape seen on 2026-10-28.
import { summarizePrices } from "../src/lib/api/itad.ts";
const now = new Date("2026-10-28T12:00:00Z");
const usd = (n) => ({ amount: n, currency: "USD" });
const deal = (shop, price, regular, ts) => ({ shop: { name: shop }, price: usd(price), regular: usd(regular), cut: Math.round(100 - (price / regular) * 100), timestamp: ts });
const entry = {
  historyLow: { all: usd(3.99), y1: usd(3.99), m3: usd(4.97) },
  deals: [
    deal("GameBillet", 30, 49.99, "2026-10-28T08:00:00Z"),   // cheapest but gray-market: excluded
    deal("Humble Store", 39.99, 39.99, "2026-05-28T08:00:00Z"), // reliable but 5 months stale: excluded
    deal("GOG", 41.99, 49.99, "2026-10-27T08:00:00Z"),        // reliable and fresh: the winner
    deal("Steam", 49.99, 49.99, "2026-10-28T09:00:00Z"),
  ],
};
const s = summarizePrices("id-1", entry, now);
let bad = 0;
const check = (n, ok) => { if (!ok) bad++; console.log(`${ok ? "ok  " : "BAD "} ${n}`); };
check("history low read", s.historyLow.all === 3.99 && s.historyLow.m3 === 4.97);
check("best fresh deal ignores gray-market and stale shops", s.bestFreshDeal?.shop === "GOG" && s.bestFreshDeal.amount === 41.99);
check("steam price captured for cross-check", s.steamPrice === 49.99);
check("no fresh reliable deal -> null", summarizePrices("x", { deals: [deal("GameBillet", 1, 2, "2026-10-28T08:00:00Z")] }, now).bestFreshDeal === null);
process.exit(bad ? 1 : 0);
