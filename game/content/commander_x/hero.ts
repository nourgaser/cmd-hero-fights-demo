import type { HeroDefinition, ListenerDefinition } from "../../shared/models";
import { COMMANDER_X_HERO_ID } from "./constants";

const COMMANDER_X_PASSIVE_HEAL_AMOUNT = 1;

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
    minimumDamage: 4,
    maximumDamage: 7,
    attackDamageScaling: 0.5,
    abilityPowerScaling: 0,
    damageType: "physical",
  },
  passiveText: `Your attacks restore ${COMMANDER_X_PASSIVE_HEAL_AMOUNT} HP (if not dodged).`,
} satisfies HeroDefinition;

export function createCommanderXInitialListeners(heroEntityId: string): ListenerDefinition[] {
  return [
    {
      listenerId: `${heroEntityId}:passive:heal-on-attack`,
      eventKind: "damageApplied",
      ownerHeroEntityId: heroEntityId,
      conditions: [
        { kind: "damageNotDodged" },
        { kind: "damageSourceIsListenerOwnerHero" },
      ],
      lifetime: "persistent",
      effects: [
        {
          id: "effect.commander-x.passive.heal-on-attack",
          payload: {
            kind: "heal",
            target: "sourceOwnerHero",
            minimum: COMMANDER_X_PASSIVE_HEAL_AMOUNT,
            maximum: COMMANDER_X_PASSIVE_HEAL_AMOUNT,
          },
          displayText: {
            template: "Restore {amount} HP.",
            params: {
              amount: COMMANDER_X_PASSIVE_HEAL_AMOUNT,
            },
          },
        },
      ],
    },
  ];
}
