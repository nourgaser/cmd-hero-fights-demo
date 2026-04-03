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
    mode: "template",
    template: "Restore {minimum}-{maximum} HP to your hero.",
    params: {
      minimum: 2,
      maximum: 4,
    },
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
        mode: "template",
        template: "Restore {minimum}-{maximum} HP.",
        params: {
          minimum: 2,
          maximum: 4,
        },
      },
    },
  ],
} satisfies CardDefinition;
