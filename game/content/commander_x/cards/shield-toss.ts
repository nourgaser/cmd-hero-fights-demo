import type { CardDefinition } from "../../../shared/models";
import { COMMANDER_X_HERO_ID } from "../constants";

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
    mode: "static",
    text: "Deal 3 damage (scales with armor).",
  },
  effects: [
    {
      id: "effect.shield-toss.damage",
      payload: {
        kind: "dealDamage",
        target: "selectedAny",
        minimum: 3,
        maximum: 3,
        damageType: "physical",
        attackDamageScaling: 0,
        abilityPowerScaling: 0,
        armorScaling: 1,
        canBeDodged: true,
      },
      displayText: {
        mode: "static",
        text: "Deal 3 damage plus armor scaling.",
      },
    },
  ],
} satisfies CardDefinition;
