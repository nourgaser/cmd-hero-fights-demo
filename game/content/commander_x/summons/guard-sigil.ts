import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityFootprint } from "../../../shared/models";
import { SUMMON_ENTITY_IDS } from "../constants";
import type { CommanderXSummonedDefinition } from "./types";

export const GUARD_SIGIL_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "totem",
  definitionCardId: "card.commander-x.guard-sigil",
  maxHealth: 5,
  armor: 1,
  magicResist: 1,
  attackDamage: 0,
  abilityPower: 0,
  criticalChance: 0,
  criticalMultiplier: 1,
  dodgeChance: 0,
  maxMovesPerTurn: 0,
  remainingMoves: 0,
};

export const GUARD_SIGIL_FOOTPRINT: EntityFootprint = [
  { row: 0, column: 0 },
];

export default {
  entityId: SUMMON_ENTITY_IDS.guardSigil,
  blueprint: GUARD_SIGIL_BLUEPRINT,
  footprint: GUARD_SIGIL_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;
