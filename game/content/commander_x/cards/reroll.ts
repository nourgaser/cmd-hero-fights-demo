import type { CardDefinition } from "../../../shared/models";

export const REROLL_CARD = {
  id: "card.general.reroll",
  name: "Reroll",
  type: "ability",
  rarity: "general",
  moveCost: 1,
  targeting: "none",
  tags: [],
  summaryText: {
    mode: "template",
    template: "Draw {amount} card.",
    params: {
      amount: 1,
    },
  },
  effects: [
    {
      id: "effect.reroll.draw",
      payload: {
        kind: "drawCards",
        target: "sourceOwnerHero",
        amount: 1,
      },
      displayText: {
        mode: "template",
        template: "Draw {amount} card.",
        params: {
          amount: 1,
        },
      },
    },
  ],
} satisfies CardDefinition;
