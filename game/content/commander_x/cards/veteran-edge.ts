import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";
import { KEYWORD_IDS } from "../../keywords";

const VETERAN_EDGE_SHARPNESS_BONUS = 1;
const VETERAN_EDGE_EXTRA_DAMAGE = 1;

export const VETERAN_EDGE_CARD = {
  id: "card.commander-x.veteran-edge",
  name: "Veteran Edge",
  type: "ability",
  rarity: "rare",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 7,
  targeting: "none",
  keywords: [{ keywordId: KEYWORD_IDS.sharpness }],
  tags: ["buff"],
  summaryText: {
    template: "Your attacks have Sharpness {sharpness} and deal +{damage} extra damage for the rest of the game.",
    params: {
      sharpness: VETERAN_EDGE_SHARPNESS_BONUS,
      damage: VETERAN_EDGE_EXTRA_DAMAGE,
    },
  },
  effects: [
    {
      id: "effect.veteran-edge.gain-sharpness",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "sharpness",
        amount: VETERAN_EDGE_SHARPNESS_BONUS,
        duration: "persistent",
        changeKind: "apply",
      },
      displayText: {
        template: "Your attacks destroy {amount} matching base/persistent resistance on hit.",
        params: {
          amount: VETERAN_EDGE_SHARPNESS_BONUS,
        },
      },
    },
    {
      id: "effect.veteran-edge.gain-extra-damage",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "attackFlatBonusDamage",
        amount: VETERAN_EDGE_EXTRA_DAMAGE,
        duration: "persistent",
        changeKind: "apply",
      },
      displayText: {
        template: "Your attacks deal +{amount} extra damage.",
        params: {
          amount: VETERAN_EDGE_EXTRA_DAMAGE,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;