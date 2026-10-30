export type TrustedReviewer = {
  channelId: string;
  channelName: string;
  slug: string;
  specialty: string;
  description: string;
  searchSuffix: string;
  /** YouTube @handle (without @) the channel ID must resolve to; checked by the audit script. */
  handle: string;
  /** Technical-analysis channel: accept tech reviews and face-offs (see youtube-lookup.ts). */
  tech?: boolean;
  /** Expected channel title, normalized by the audit (lowercase, no spaces). */
  expectedTitle: string;
};

export const TRUSTED_REVIEWERS: TrustedReviewer[] = [
  {
    channelId: "UCK9_x1DImhU-eolIay5rb2Q",
    channelName: "ACG",
    slug: "acg",
    specialty: "Value & Technicals",
    description:
      "Breaks down music, voice acting, and graphics independently. If a game has padding, he'll call it out as a 'Rent' or 'Wait for Sale.'",
    searchSuffix: "review",
    handle: "ACG",
    expectedTitle: "ACG",
  },
  {
    channelId: "UCEQ7KR9enYdQsB6kcMnw0NA",
    channelName: "Mortismal Gaming",
    slug: "mortismal",
    specialty: "Completionist Friction",
    description:
      "His 'Review After 100%' gimmick reveals whether full completion is rewarding or soul-sucking.",
    searchSuffix: "review after 100%",
    handle: "MortismalGaming",
    expectedTitle: "Mortismal Gaming",
  },
  {
    channelId: "UC9PBzalIcEQCsiIkq36PyUA",
    channelName: "Digital Foundry",
    slug: "digital-foundry",
    specialty: "Technical BS",
    description:
      "Essential for detecting performance bloat. If a game runs at 20fps or is riddled with bugs, they provide the data.",
    searchSuffix: "tech review",
    handle: "DigitalFoundry",
    tech: true,
    expectedTitle: "Digital Foundry",
  },
  {
    channelId: "UCJhsl2VeLfSXzkutwlICyZw",
    channelName: "The Sphere Hunter",
    slug: "sphere-hunter",
    specialty: "Pacing & Horror/Action",
    description:
      "Expert on authored vs padded experiences. Values tight 10-15 hour games over 100-hour open worlds.",
    searchSuffix: "review",
    handle: "TheSphereHunter",
    expectedTitle: "The Sphere Hunter",
  },
  {
    channelId: "UC477Kvszl9JivqOxN1dFgPQ",
    channelName: "Iron Pineapple",
    slug: "iron-pineapple",
    specialty: "Souls-like Trash Detection",
    description:
      "Knows exactly when a Soulslike is milking it with bad boss runs and artificial difficulty.",
    searchSuffix: "review",
    handle: "IronPineapple",
    expectedTitle: "Iron Pineapple",
  },
  {
    channelId: "UCywBfpGBYhsczNuyyh6Cf6w",
    channelName: "Worth A Buy",
    slug: "worth-a-buy",
    specialty: "Mechanical Integrity",
    description:
      "Zero-tolerance policy for modern AAA tropes — microtransactions, forced tutorials, and hand-holding.",
    searchSuffix: "review",
    handle: "WorthABuy",
    expectedTitle: "Worth A Buy",
  },
  {
    channelId: "UCZ7AeeVbyslLM_8-nVy2B8Q",
    channelName: "SkillUp",
    slug: "skillup",
    specialty: "In-Depth Analysis",
    description:
      "Thorough long-form reviews that often call out pacing issues, padding, and value proposition.",
    searchSuffix: "review",
    handle: "SkillUp",
    expectedTitle: "Skill Up",
  },
  {
    channelId: "UC9N0DmacOi4iWKQyygX89OQ",
    channelName: "FightinCowboy",
    slug: "fightincowboy",
    specialty: "Walkthrough Expert",
    description:
      "Known for detailed walkthroughs — his perspective reveals how much actual content vs filler exists.",
    searchSuffix: "review",
    handle: "FightinCowboy",
    expectedTitle: "FightinCowboy",
  },
  {
    channelId: "UCKy1dAqELo0zrOtPkf0eTMw",
    channelName: "IGN",
    slug: "ign",
    specialty: "Mainstream Critic",
    description:
      "Largest outlet; broad coverage of nearly every release, so it fills gaps the niche channels leave.",
    searchSuffix: "review",
    handle: "IGN",
    expectedTitle: "IGN",
  },
  {
    channelId: "UCbu2SsF-Or3Rsn3NxqODImw",
    channelName: "GameSpot",
    slug: "gamespot",
    specialty: "Mainstream Critic",
    description:
      "Broad review coverage with consistent structure; useful second mainstream voice.",
    searchSuffix: "review",
    handle: "GameSpot",
    expectedTitle: "GameSpot",
  },
  {
    channelId: "UCciKycgzURdymx-GRSY2_dA",
    channelName: "Eurogamer",
    slug: "eurogamer",
    specialty: "Critic",
    description:
      "Considered long-form reviews with attention to pacing and design.",
    searchSuffix: "review",
    handle: "Eurogamer",
    expectedTitle: "Eurogamer",
  },
  {
    channelId: "UCgaPRP68bbyHnfkPhWWBrNw",
    channelName: "PC Gamer",
    slug: "pc-gamer",
    specialty: "PC Critic",
    description:
      "PC-focused reviews that cover performance, controls, and mod/replay value.",
    searchSuffix: "review",
    handle: "PCGamer",
    expectedTitle: "PC Gamer",
  },
  {
    channelId: "UCZrxXp1reP8E353rZsB3jaA",
    channelName: "Easy Allies",
    slug: "easy-allies",
    specialty: "Critic",
    description:
      "Detailed team reviews with a clear verdict; strong on mid-size and indie releases.",
    searchSuffix: "review",
    handle: "EasyAllies",
    expectedTitle: "Easy Allies",
  },
  {
    channelId: "UCk2ipH2l8RvLG0dr-rsBiZw",
    channelName: "GamesRadar",
    slug: "gamesradar",
    specialty: "Mainstream Critic",
    description:
      "Wide coverage including many console releases.",
    searchSuffix: "review",
    handle: "GamesRadar",
    expectedTitle: "GamesRadar",
  },
  {
    channelId: "UCoFpRCAsKfWAshvLE1bYzdw",
    channelName: "Rerez",
    slug: "rerez",
    specialty: "Critic",
    description:
      "Opinionated, personality-driven reviews with plain talk on padding and design.",
    searchSuffix: "review",
    handle: "Rerez",
    expectedTitle: "Rerez",
  },
  {
    channelId: "UC1JTQBa5QxZCpXrFSkMxmPw",
    channelName: "Raycevick",
    slug: "raycevick",
    specialty: "Critic",
    description:
      "Candid long-form reviews that call out filler and design problems.",
    searchSuffix: "review",
    handle: "Raycevick",
    expectedTitle: "Raycevick",
  },
];
