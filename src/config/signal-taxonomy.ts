export type Signal = {
  key: string;
  label: string;
  description: string;
  polarity: "positive" | "negative";
  pillarAffinity: ("pacing" | "bloat" | "value" | "grind")[];
};

export const NEGATIVE_SIGNALS: Signal[] = [
  {
    key: "map_vomit",
    label: "Map Vomit",
    description: "Excessive, low-quality map markers and collectibles that pad playtime",
    polarity: "negative",
    pillarAffinity: ["bloat", "pacing"],
  },
  {
    key: "mandatory_level_gating",
    label: "Mandatory Level Gating",
    description: "Forced grinding to meet level requirements before story progression",
    polarity: "negative",
    pillarAffinity: ["grind", "pacing"],
  },
  {
    key: "repetitive_side_content",
    label: "Repetitive Side Content",
    description: "Side quests or activities that recycle objectives with minimal variation",
    polarity: "negative",
    pillarAffinity: ["bloat", "pacing"],
  },
  {
    key: "fetch_quest_overload",
    label: "Fetch Quest Overload",
    description: "Excessive go-here-grab-this missions with no narrative payoff",
    polarity: "negative",
    pillarAffinity: ["bloat", "pacing"],
  },
  {
    key: "walk_and_talk_downtime",
    label: "Walk-and-Talk Downtime",
    description: "Unskippable slow-walk exposition segments that kill pacing",
    polarity: "negative",
    pillarAffinity: ["pacing"],
  },
  {
    key: "forced_crafting_grind",
    label: "Forced Crafting Grind",
    description: "Mandatory material farming to progress through the game",
    polarity: "negative",
    pillarAffinity: ["grind", "bloat"],
  },
  {
    key: "weak_loot_treadmill",
    label: "Weak Loot Treadmill",
    description: "Loot system that creates artificial replay without meaningful rewards",
    polarity: "negative",
    pillarAffinity: ["grind", "value"],
  },
  {
    key: "overlong_tutorialization",
    label: "Overlong Tutorialization",
    description: "Extended hand-holding that delays the real game for hours",
    polarity: "negative",
    pillarAffinity: ["pacing"],
  },
  {
    key: "poor_checkpointing",
    label: "Poor Checkpointing",
    description: "Bad save/checkpoint placement that forces replaying large sections",
    polarity: "negative",
    pillarAffinity: ["pacing", "value"],
  },
  {
    key: "technical_instability",
    label: "Technical Instability",
    description: "Bugs, crashes, or performance issues that waste player time",
    polarity: "negative",
    pillarAffinity: ["value"],
  },
  {
    key: "padded_traversal",
    label: "Padded Traversal",
    description: "Long, empty travel sections designed to inflate play time",
    polarity: "negative",
    pillarAffinity: ["bloat", "pacing"],
  },
  {
    key: "low_value_completion",
    label: "Low-Value Completion",
    description: "100% content that offers no meaningful reward or satisfaction",
    polarity: "negative",
    pillarAffinity: ["bloat", "value"],
  },
  {
    key: "unskippable_cutscenes",
    label: "Unskippable Cutscenes",
    description: "Forced viewing of cinematics, especially on repeat playthroughs",
    polarity: "negative",
    pillarAffinity: ["pacing"],
  },
  {
    key: "artificial_difficulty_spikes",
    label: "Artificial Difficulty Spikes",
    description: "Sudden difficulty jumps designed to push grinding or purchases",
    polarity: "negative",
    pillarAffinity: ["grind", "pacing"],
  },
  {
    key: "excessive_backtracking",
    label: "Excessive Backtracking",
    description: "Forced revisiting of areas without new content or purpose",
    polarity: "negative",
    pillarAffinity: ["bloat", "pacing"],
  },
  {
    key: "hollow_open_world",
    label: "Hollow Open World",
    description: "Large world with sparse, repetitive content to fill space",
    polarity: "negative",
    pillarAffinity: ["bloat", "value"],
  },
  {
    key: "microtransaction_pressure",
    label: "Microtransaction Pressure",
    description: "Game design that encourages real-money spending to skip grind",
    polarity: "negative",
    pillarAffinity: ["grind", "value"],
  },
  {
    key: "daily_login_mechanics",
    label: "Daily Login Mechanics",
    description: "FOMO-driven daily reward systems that demand habitual play",
    polarity: "negative",
    pillarAffinity: ["grind"],
  },
  {
    key: "rng_gated_progression",
    label: "RNG-Gated Progression",
    description: "Core progression locked behind random drops or dice rolls",
    polarity: "negative",
    pillarAffinity: ["grind", "value"],
  },
  {
    key: "forced_multiplayer",
    label: "Forced Multiplayer",
    description: "Single-player content gated behind multiplayer requirements",
    polarity: "negative",
    pillarAffinity: ["value"],
  },
  {
    key: "fomo_mechanics",
    label: "FOMO Mechanics",
    description: "Time-limited content that pressures players to play on a schedule",
    polarity: "negative",
    pillarAffinity: ["grind", "value"],
  },
  {
    key: "content_recycling",
    label: "Content Recycling",
    description: "Reused bosses, environments, or encounters to pad content",
    polarity: "negative",
    pillarAffinity: ["bloat", "pacing"],
  },
];

export const POSITIVE_SIGNALS: Signal[] = [
  {
    key: "authored_density",
    label: "Authored Density",
    description: "Every area and encounter feels hand-crafted with intention",
    polarity: "positive",
    pillarAffinity: ["pacing", "bloat"],
  },
  {
    key: "meaningful_side_quests",
    label: "Meaningful Side Quests",
    description: "Optional content with real narrative or mechanical payoff",
    polarity: "positive",
    pillarAffinity: ["bloat", "value"],
  },
  {
    key: "fast_onboarding",
    label: "Fast Onboarding",
    description: "Gets you into the real game quickly with minimal tutorial padding",
    polarity: "positive",
    pillarAffinity: ["pacing"],
  },
  {
    key: "strong_encounter_variety",
    label: "Strong Encounter Variety",
    description: "Combat and challenges stay fresh throughout the experience",
    polarity: "positive",
    pillarAffinity: ["pacing", "bloat"],
  },
  {
    key: "rewarding_mastery",
    label: "Rewarding Mastery",
    description: "Skill improvement feels satisfying and is properly rewarded",
    polarity: "positive",
    pillarAffinity: ["grind", "pacing"],
  },
  {
    key: "compact_campaign",
    label: "Compact Campaign",
    description: "Story doesn't overstay its welcome — tight beginning, middle, and end",
    polarity: "positive",
    pillarAffinity: ["pacing", "bloat"],
  },
  {
    key: "high_optional_quality",
    label: "High Optional Quality",
    description: "Side content is genuinely worth doing, not just checklist filler",
    polarity: "positive",
    pillarAffinity: ["bloat", "value"],
  },
  {
    key: "exploration_with_payoff",
    label: "Exploration with Payoff",
    description: "Exploring the world consistently rewards the player with meaningful finds",
    polarity: "positive",
    pillarAffinity: ["bloat", "value"],
  },
  {
    key: "short_runtime_high_replay",
    label: "Short Runtime, High Replay Value",
    description: "Concise experience that encourages and rewards multiple playthroughs",
    polarity: "positive",
    pillarAffinity: ["value", "pacing"],
  },
  {
    key: "all_killer_no_filler",
    label: "All Killer, No Filler",
    description: "Every minute of the game contributes to the core experience",
    polarity: "positive",
    pillarAffinity: ["pacing", "bloat"],
  },
  {
    key: "respectful_save_system",
    label: "Respectful Save System",
    description: "Save system that respects the player's time and session flexibility",
    polarity: "positive",
    pillarAffinity: ["value"],
  },
  {
    key: "transparent_progression",
    label: "Transparent Progression",
    description: "Clear, fair progression systems with no hidden grind walls",
    polarity: "positive",
    pillarAffinity: ["grind"],
  },
  {
    key: "quality_of_life_features",
    label: "Quality of Life Features",
    description: "Fast travel, skip options, and player-friendly conveniences",
    polarity: "positive",
    pillarAffinity: ["value", "pacing"],
  },
  {
    key: "post_game_substance",
    label: "Post-Game Substance",
    description: "Endgame content that offers genuine new challenges, not just harder numbers",
    polarity: "positive",
    pillarAffinity: ["value", "grind"],
  },
];

export const ALL_SIGNALS = [...NEGATIVE_SIGNALS, ...POSITIVE_SIGNALS];

export function getSignalByKey(key: string): Signal | undefined {
  return ALL_SIGNALS.find((s) => s.key === key);
}
