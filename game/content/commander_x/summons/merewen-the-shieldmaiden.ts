import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityActiveProfile } from "../../../engine/actions/resolve-use-entity-active";
import type { EntityFootprint } from "../../../shared/models";
import { KEYWORD_IDS } from "../../keywords";
import { SUMMON_ENTITY_IDS } from "../constants";
import type { CommanderXSummonedDefinition } from "./types";

const MEREWEN_ADJACENT_HEAL_AMOUNT = 4;

export const MEREWEN_THE_SHIELDMAIDEN_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "companion",
  definitionCardId: "card.commander-x.merewen-the-shieldmaiden",
  keywordIds: [KEYWORD_IDS.chivalry, KEYWORD_IDS.taunt],
  maxHealth: 25,
  armor: 2,
  magicResist: 0,
  attackDamage: 0,
  abilityPower: 0,
  criticalChance: 0.1,
  criticalMultiplier: 1.5,
  dodgeChance: 0.1,
  maxMovesPerTurn: 1,
  remainingMoves: 1,
};

export const MEREWEN_THE_SHIELDMAIDEN_ACTIVE: EntityActiveProfile = {
  kind: "effect",
  moveCost: 2,
  summaryText: {
    template: "Restore {amount} HP to all adjacent allies. Next attack on this is reflected.",
    params: {
      amount: MEREWEN_ADJACENT_HEAL_AMOUNT,
    },
  },
  effects: [
    {
      id: "effect.merewen.active-grant-health",
      payload: {
        kind: "heal",
        target: "sourceEntityAdjacentAllies",
        minimum: MEREWEN_ADJACENT_HEAL_AMOUNT,
        maximum: MEREWEN_ADJACENT_HEAL_AMOUNT,
      },
      displayText: {
        template: "Adjacent allies heal for +{amount} HP.",
        params: {
          amount: MEREWEN_ADJACENT_HEAL_AMOUNT,
        },
      },
    },
    {
      id: "effect.merewen.active-add-reflect-listener",
      payload: {
        kind: "addListener",
        listenerId: "listener.merewen.reflect-next-attack",
        eventKind: "damageApplied",
        sourceBinding: "lastSummonedEntity",
        conditions: [
          { kind: "damageIsAttack" },
          { kind: "damageNotDodged" },
          { kind: "damageTargetIsListenerSource" },
        ],
        lifetime: "once",
        effects: [
          {
            id: "effect.merewen.reflect-next-attack.damage",
            payload: {
              kind: "reflectDamage",
              target: "triggeringSourceEntity",
            },
            displayText: {
              template: "Reflect that attack back to the attacker.",
            },
          },
        ],
      },
      displayText: {
        template: "The next attack on Merewen is reflected.",
      },
    },
  ],
};

export const MEREWEN_THE_SHIELDMAIDEN_FOOTPRINT: EntityFootprint = [
  { row: 0, column: 0 },
];

export default {
  entityId: SUMMON_ENTITY_IDS.merewenTheShieldmaiden,
  blueprint: MEREWEN_THE_SHIELDMAIDEN_BLUEPRINT,
  active: MEREWEN_THE_SHIELDMAIDEN_ACTIVE,
  footprint: MEREWEN_THE_SHIELDMAIDEN_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;
