import type { HeroDefinition } from "../../shared/models";
import { COMMANDER_X_HERO_ID } from "./constants";

export const COMMANDER_X_HERO = {
  id: COMMANDER_X_HERO_ID,
  name: "Commander X",
  footprint: [
    { row: 0, column: 0 },
    { row: 0, column: 1 },
    { row: 0, column: 2 },
  ],
  combat: {
    maxHealth: 60,
    armor: 2,
    magicResist: 2,
    attackDamage: 4,
    abilityPower: 0,
    criticalChance: 0.2,
    criticalMultiplier: 1.5,
    dodgeChance: 0.1,
  },
  basicAttack: {
    moveCost: 3,
    minimumDamage: 1,
    maximumDamage: 3,
    attackDamageScaling: 0.5,
    abilityPowerScaling: 0,
    damageType: "physical",
  },
  passiveText: "Your attacks restore 1 HP (if not dodged).",
} satisfies HeroDefinition;
