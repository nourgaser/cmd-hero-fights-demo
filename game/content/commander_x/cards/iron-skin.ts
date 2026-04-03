import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";

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
    mode: "template",
    template: "Gain {amount} armor.",
    params: {
      amount: 1,
    },
  },
  effects: [
    {
      id: "effect.iron-skin.gain-armor",
      payload: {
        kind: "gainArmor",
        target: "sourceOwnerHero",
        amount: 1,
      },
      displayText: {
        mode: "template",
        template: "Gain {amount} armor.",
        params: {
          amount: 1,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;
