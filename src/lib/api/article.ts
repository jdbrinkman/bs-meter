export type ArticleResult = {
  text: string | null;
  status: "ok" | "empty" | "failed";
  detail: string;
  words: number;
};

const MAX_WORDS = 5000;
const MIN_WORDS = 350;

// Site furniture that survives paragraph extraction: comment prompts, newsletter and policy blurbs
const BOILERPLATE = /display name|logout and then login|sign up to|newsletter|subscribe|our experienced team|affiliate|cookie|privacy policy|terms of use|all rights reserved|follow us|leave a comment|join the conversation/i;

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&rsquo;|&#8217;/g, "'").replace(/&lsquo;|&#8216;/g, "'")
    .replace(/&ldquo;|&rdquo;|&#822[01];/g, '"').replace(/&ndash;|&#8211;/g, "-").replace(/&mdash;|&#8212;/g, "-")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** Extracts readable paragraph text from an HTML page. Heuristic, no dependencies. */
export function extractArticleText(html: string): string {
  let h = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|header|footer|aside|form|figure|iframe)[\s\S]*?<\/\1>/gi, " ");
  const grab = (tag: string) => {
    const all = [...h.matchAll(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi"))].map((m) => m[0]);
    return all.sort((a, b) => b.length - a.length)[0];
  };
  h = grab("article") ?? grab("main") ?? h;
  const paragraphs = [...h.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => decode(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .filter((p) => p.split(" ").length >= 8 && !BOILERPLATE.test(p));
  return paragraphs.join("\n\n");
}

export async function fetchArticleText(url: string): Promise<ArticleResult> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return { text: null, status: "failed", detail: `HTTP ${res.status}`, words: 0 };
    const type = res.headers.get("content-type") || "";
    if (!type.includes("html")) return { text: null, status: "failed", detail: `not HTML (${type})`, words: 0 };

    const text = extractArticleText(await res.text());
    const words = text ? text.split(/\s+/).length : 0;
    if (words < MIN_WORDS) return { text: null, status: "empty", detail: `only ${words} words extracted (paywall, JS-rendered, or not a review)`, words };
    const trimmed = words > MAX_WORDS ? text.split(/\s+/).slice(0, MAX_WORDS).join(" ") : text;
    return { text: trimmed, status: "ok", detail: `${words} words`, words };
  } catch (error) {
    return { text: null, status: "failed", detail: (error instanceof Error ? error.message : String(error)).slice(0, 140), words: 0 };
  }
}
