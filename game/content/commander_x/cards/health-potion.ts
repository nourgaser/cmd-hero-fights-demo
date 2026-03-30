import type { CardDefinition } from "../../../shared/models";
import { COMMANDER_X_HERO_ID } from "../constants";

export const HEALTH_POTION_CARD = {
  id: "card.commander-x.health-potion",
  name: "Health Potion",
  type: "ability",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 4,
  targeting: "none",
  tags: ["heal"],
  summaryText: {
    mode: "static",
    text: "Restore 2-4 HP to your hero.",
  },
  effects: [
    {
      id: "effect.health-potion.heal",
      payload: {
        kind: "heal",
        target: "sourceOwnerHero",
        minimum: 2,
        maximum: 4,
      },
      displayText: {
        mode: "static",
        text: "Restore 2-4 HP.",
      },
    },
  ],
} satisfies CardDefinition;
