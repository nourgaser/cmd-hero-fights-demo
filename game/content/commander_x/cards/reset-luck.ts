import type { StrongCardDefinition } from "./types";

const RESET_LUCK_MOVE_COST = 5;

export const RESET_LUCK_CARD = {
  id: "card.general.reset-luck",
  name: "Reset Luck",
  type: "ability",
  rarity: "general",
  moveCost: RESET_LUCK_MOVE_COST,
  targeting: "none",
  tags: [],
  summaryText: {
    template: "Reset luck balance to neutral.",
  },
  effects: [
    {
      id: "effect.reset-luck.balance",
      payload: {
        kind: "resetLuckBalance",
      },
      displayText: {
        template: "Set luck balance to 0.",
      },
    },
  ],
} satisfies StrongCardDefinition;
