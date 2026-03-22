/**
 * Reddit sentiment search via Perplexity API.
 * Searches Reddit for user complaints, bugs, and sentiment about a game.
 * Returns a plain-text summary, or null if the API key is not set or the call fails.
 */
export async function searchRedditSentiment(
  gameTitle: string
): Promise<string | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.log("PERPLEXITY_API_KEY not set — skipping Reddit sentiment");
    return null;
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content:
              "You are a research assistant summarizing Reddit user sentiment about video games. Be concise and factual. Focus on recurring complaints, technical issues, bugs, and community reception. Do not editorialize.",
          },
          {
            role: "user",
            content: `Summarize what Reddit users say about "${gameTitle}". Focus on: common complaints, bugs or technical issues at launch, gameplay frustrations, and overall community sentiment. Keep your answer to 3-5 short paragraphs. Search Reddit specifically.`,
          },
        ],
        max_tokens: 600,
        search_domain_filter: ["reddit.com"],
      }),
    });

    if (!response.ok) {
      console.warn(`Perplexity API error for "${gameTitle}": ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    return content as string;
  } catch (error) {
    console.warn(`Reddit sentiment search failed for "${gameTitle}":`, error);
    return null;
  }
}
