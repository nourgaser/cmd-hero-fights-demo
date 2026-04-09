import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";

const SHATTER_PLATING_MOVE_COST = 9;
const SHATTER_PLATING_DAMAGE_PER_ARMOR = 5;

export const SHATTER_PLATING_CARD = {
  id: "card.commander-x.shatter-plating",
  name: "Shatter Plating",
  type: "ability",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: SHATTER_PLATING_MOVE_COST,
  targeting: "selectedAny",
  tags: ["sacrifice"],
  summaryText: {
    template:
      "Destroy all of your base armor. Deal {damagePerArmor} damage per armor destroyed to a selected target.",
    params: {
      damagePerArmor: SHATTER_PLATING_DAMAGE_PER_ARMOR,
    },
  },
  effects: [
    {
      id: "effect.shatter-plating.burst",
      payload: {
        kind: "destroySelfArmorAndDealPerArmorToTarget",
        target: "selectedAny",
        damagePerArmor: SHATTER_PLATING_DAMAGE_PER_ARMOR,
        damageType: "physical",
      },
      displayText: {
        template:
          "Destroy all of your base armor. Deal {damagePerArmor} physical damage per armor destroyed.",
        params: {
          damagePerArmor: SHATTER_PLATING_DAMAGE_PER_ARMOR,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;
