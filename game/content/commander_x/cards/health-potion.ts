import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";

const HEALTH_POTION_HEAL_MIN = 4;
const HEALTH_POTION_HEAL_MAX = 12;

export const HEALTH_POTION_CARD = {
  id: "card.commander-x.health-potion",
  name: "Health Potion",
  type: "ability",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 5,
  targeting: "none",
  tags: ["heal"],
  summaryText: {
    template: "Restore {minimum}-{maximum} HP to your hero.",
    params: {
      minimum: HEALTH_POTION_HEAL_MIN,
      maximum: HEALTH_POTION_HEAL_MAX,
    },
  },
  effects: [
    {
      id: "effect.health-potion.heal",
      payload: {
        kind: "heal",
        target: "sourceOwnerHero",
        minimum: HEALTH_POTION_HEAL_MIN,
        maximum: HEALTH_POTION_HEAL_MAX,
      },
      displayText: {
        template: "Restore {minimum}-{maximum} HP.",
        params: {
          minimum: HEALTH_POTION_HEAL_MIN,
          maximum: HEALTH_POTION_HEAL_MAX,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;
