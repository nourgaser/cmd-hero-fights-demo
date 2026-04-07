import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";

const WARCRY_MOVE_COST = 6;
const WARCRY_DAMAGE_PER_ARMOR = 3;

export const WARCRY_CARD = {
  id: "card.commander-x.warcry",
  name: "Warcry",
  type: "ability",
  rarity: "rare",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: WARCRY_MOVE_COST,
  targeting: "selectedAnyExceptEnemyHero",
  tags: ["armor", "burst"],
  summaryText: {
    template:
      "Destroy base and permanent armor on a target, then deal {damagePerArmor} damage to the enemy hero per armor destroyed.",
    params: {
      damagePerArmor: WARCRY_DAMAGE_PER_ARMOR,
    },
  },
  effects: [
    {
      id: "effect.warcry.shatter-armor",
      payload: {
        kind: "destroyArmorAndDealPerArmorToEnemyHero",
        target: "selectedAny",
        damagePerArmor: WARCRY_DAMAGE_PER_ARMOR,
        damageType: "physical",
      },
      displayText: {
        template:
          "Destroy base and permanent armor on target. Deal {damagePerArmor} physical damage to the enemy hero per armor destroyed.",
        params: {
          damagePerArmor: WARCRY_DAMAGE_PER_ARMOR,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;
