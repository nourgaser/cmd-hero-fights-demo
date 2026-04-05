import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";

const IRON_SKIN_ARMOR_GAIN = 1;

export const IRON_SKIN_CARD = {
  id: "card.commander-x.iron-skin",
  name: "Iron Skin",
  type: "ability",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 5,
  targeting: "none",
  tags: [],
  summaryText: {
    template: "Gain {amount} armor.",
    params: {
      amount: IRON_SKIN_ARMOR_GAIN,
    },
  },
  effects: [
    {
      id: "effect.iron-skin.gain-armor",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "armor",
        amount: IRON_SKIN_ARMOR_GAIN,
        duration: "persistent",
        changeKind: "apply",
      },
      displayText: {
        template: "Gain {amount} armor.",
        params: {
          amount: IRON_SKIN_ARMOR_GAIN,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;
