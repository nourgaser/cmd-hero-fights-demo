import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";

const CHAAARGE_MOVE_COST = 10;
const CHAAARGE_CAST_HEALTH_THRESHOLD = 15;
const CHAAARGE_DAMAGE_MIN = 4;
const CHAAARGE_DAMAGE_MAX = 20;

export const CHAAARGE_CARD = {
  id: "card.commander-x.chaaarge",
  name: "Chaaarge!",
  type: "ability",
  rarity: "ultimate",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: CHAAARGE_MOVE_COST,
  targeting: "selectedEnemy",
  castCondition: {
    kind: "heroHealthBelow",
    threshold: CHAAARGE_CAST_HEALTH_THRESHOLD,
  },
  tags: ["refund"],
  summaryText: {
    template:
      "Deal {minimum}-{maximum} damage to an enemy. Only playable when Commander X is below {threshold} HP. If not dodged, refund move cost.",
    params: {
      minimum: CHAAARGE_DAMAGE_MIN,
      maximum: CHAAARGE_DAMAGE_MAX,
      threshold: CHAAARGE_CAST_HEALTH_THRESHOLD,
    },
  },
  effects: [
    {
      id: "effect.chaaarge.damage",
      payload: {
        kind: "dealDamage",
        target: "selectedEnemy",
        minimum: CHAAARGE_DAMAGE_MIN,
        maximum: CHAAARGE_DAMAGE_MAX,
        damageType: "physical",
        attackDamageScaling: 1,
        abilityPowerScaling: 0,
        armorScaling: 0,
        canBeDodged: true,
      },
      displayText: {
        template: "Deal {minimum}-{maximum} physical damage.",
        params: {
          minimum: CHAAARGE_DAMAGE_MIN,
          maximum: CHAAARGE_DAMAGE_MAX,
        },
      },
    },
    {
      id: "effect.chaaarge.refund",
      payload: {
        kind: "refundMoveCost",
        amount: CHAAARGE_MOVE_COST,
        condition: "ifNotDodged",
      },
      displayText: {
        template: "If not dodged, refund {amount} move points.",
        params: {
          amount: CHAAARGE_MOVE_COST,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;
