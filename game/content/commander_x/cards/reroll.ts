import type { StrongCardDefinition } from "./types";

const REROLL_DRAW_AMOUNT = 1;

export const REROLL_CARD = {
  id: "card.general.reroll",
  name: "Reroll",
  type: "ability",
  rarity: "general",
  moveCost: 3,
  targeting: "none",
  tags: [],
  summaryText: {
    template: "Draw {amount} card.",
    params: {
      amount: REROLL_DRAW_AMOUNT,
    },
  },
  effects: [
    {
      id: "effect.reroll.draw",
      payload: {
        kind: "drawCards",
        target: "sourceOwnerHero",
        amount: REROLL_DRAW_AMOUNT,
      },
      displayText: {
        template: "Draw {amount} card.",
        params: {
          amount: REROLL_DRAW_AMOUNT,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;
