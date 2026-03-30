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
    mode: "static",
    text: "Draw a card.",
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
        mode: "static",
        text: "Draw 1 card.",
      },
    },
  ],
} satisfies CardDefinition;
