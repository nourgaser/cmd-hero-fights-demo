import type { CardDefinition } from "../../../shared/models";
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
    mode: "static",
    text: "Gain 1 armor.",
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
        mode: "static",
        text: "Gain 1 armor.",
      },
    },
  ],
} satisfies CardDefinition;
