export type TrustedReviewer = {
  channelId: string;
  channelName: string;
  slug: string;
  specialty: string;
  description: string;
  searchSuffix: string;
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
  },
  {
    channelId: "UCE8Jga8EoeBFzOmSKMFl84g",
    channelName: "Mortismal Gaming",
    slug: "mortismal",
    specialty: "Completionist Friction",
    description:
      "His 'Review After 100%' gimmick reveals whether full completion is rewarding or soul-sucking.",
    searchSuffix: "review after 100%",
  },
  {
    channelId: "UC9PBzalIcEQCsiIkq36PyUA",
    channelName: "Digital Foundry",
    slug: "digital-foundry",
    specialty: "Technical BS",
    description:
      "Essential for detecting performance bloat. If a game runs at 20fps or is riddled with bugs, they provide the data.",
    searchSuffix: "tech review",
  },
  {
    channelId: "UCMvaVBsKOPaJmfGgJVETtrQ",
    channelName: "The Sphere Hunter",
    slug: "sphere-hunter",
    specialty: "Pacing & Horror/Action",
    description:
      "Expert on authored vs padded experiences. Values tight 10-15 hour games over 100-hour open worlds.",
    searchSuffix: "review",
  },
  {
    channelId: "UC3ltptWa0xfrDweghW94Acg",
    channelName: "Iron Pineapple",
    slug: "iron-pineapple",
    specialty: "Souls-like Trash Detection",
    description:
      "Knows exactly when a Soulslike is milking it with bad boss runs and artificial difficulty.",
    searchSuffix: "review",
  },
  {
    channelId: "UCywBfpGBYhsczNuyyh6Cf9w",
    channelName: "Worth A Buy",
    slug: "worth-a-buy",
    specialty: "Mechanical Integrity",
    description:
      "Zero-tolerance policy for modern AAA tropes — microtransactions, forced tutorials, and hand-holding.",
    searchSuffix: "review",
  },
  {
    channelId: "UCZ7AeeVbyslLM_8-nVy2B8Q",
    channelName: "SkillUp",
    slug: "skillup",
    specialty: "In-Depth Analysis",
    description:
      "Thorough long-form reviews that often call out pacing issues, padding, and value proposition.",
    searchSuffix: "review",
  },
  {
    channelId: "UCwFEjtz9pk4xMOiT4lSi7sQ",
    channelName: "FightinCowboy",
    slug: "fightincowboy",
    specialty: "Walkthrough Expert",
    description:
      "Known for detailed walkthroughs — his perspective reveals how much actual content vs filler exists.",
    searchSuffix: "review",
  },
];
