import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";

const SHIELD_TOSS_BASE_DAMAGE = 3;

export const SHIELD_TOSS_CARD = {
  id: "card.commander-x.shield-toss",
  name: "Shield Toss",
  type: "ability",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 5,
  targeting: "selectedAny",
  tags: [],
  summaryText: {
    template: "Deal {minimum} damage (scales with armor).",
    params: {
      minimum: SHIELD_TOSS_BASE_DAMAGE,
    },
  },
  effects: [
    {
      id: "effect.shield-toss.damage",
      payload: {
        kind: "dealDamage",
        target: "selectedAny",
        minimum: SHIELD_TOSS_BASE_DAMAGE,
        maximum: SHIELD_TOSS_BASE_DAMAGE,
        damageType: "physical",
        attackDamageScaling: 0,
        abilityPowerScaling: 0,
        armorScaling: 1,
        canBeDodged: true,
      },
      displayText: {
        template: "Deal {minimum} damage plus armor scaling.",
        params: {
          minimum: SHIELD_TOSS_BASE_DAMAGE,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;
