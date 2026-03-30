import type { CardDefinition } from "../../../shared/models";
import { COMMANDER_X_HERO_ID } from "../constants";

export const CHAAARGE_CARD = {
  id: "card.commander-x.chaaarge",
  name: "Chaaarge!",
  type: "ability",
  rarity: "ultimate",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 10,
  targeting: "selectedEnemy",
  tags: ["refund"],
  summaryText: {
    mode: "static",
    text: "Deal 2-10 damage to an enemy. If not dodged, refund move cost.",
  },
  effects: [
    {
      id: "effect.chaaarge.damage",
      payload: {
        kind: "dealDamage",
        target: "selectedEnemy",
        minimum: 2,
        maximum: 10,
        damageType: "physical",
        attackDamageScaling: 1,
        abilityPowerScaling: 0,
        armorScaling: 0,
        canBeDodged: true,
      },
      displayText: {
        mode: "static",
        text: "Deal 2-10 physical damage.",
      },
    },
    {
      id: "effect.chaaarge.refund",
      payload: {
        kind: "refundMoveCost",
        amount: 10,
        condition: "ifNotDodged",
      },
      displayText: {
        mode: "static",
        text: "If not dodged, refund move cost.",
      },
    },
  ],
} satisfies CardDefinition;
