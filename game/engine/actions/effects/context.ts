import {
  type BattleEvent,
  type BattleState,
  type EffectDefinition,
  type EntityFootprint,
  type HeroEntityState,
  type PlayCardAction,
  type SummonedEntityKind,
} from "../../../shared/models";
import { type BattleRng } from "../../core/rng";

export type SummonedEntityBlueprint = {
  kind: SummonedEntityKind;
  definitionCardId: string;
  keywordIds?: string[];
  maxHealth: number;
  armor: number;
  magicResist: number;
  attackDamage: number;
  abilityPower: number;
  criticalChance: number;
  criticalMultiplier: number;
  dodgeChance: number;
  baseSharpness?: number;
  maxMovesPerTurn?: number;
  remainingMoves: number;
  moveRefreshIntervalTurns?: number;
  footprint?: EntityFootprint;
};

export type ExecuteCardEffectResult =
  | {
      ok: true;
      state: BattleState;
      events: BattleEvent[];
      nextSequence: number;
      lastDamageWasDodged: boolean | undefined;
      lastSummonedEntityId: string | undefined;
    }
  | {
      ok: false;
      reason: string;
    };

export type EffectExecutionContext = {
  state: BattleState;
  effect: EffectDefinition;
  action: PlayCardAction;
  actorHero: HeroEntityState;
  sequence: number;
  battleRng: BattleRng;
  triggerEvent: BattleEvent | undefined;
  lastDamageWasDodged: boolean | undefined;
  lastSummonedEntityId: string | undefined;
  effectSourceEntityId: string | undefined;
  createSummonedEntityId: (context: {
    ownerHeroEntityId: string;
    entityDefinitionId: string;
    sequence: number;
  }) => string;
  resolveSummonedEntityBlueprint: (
    entityDefinitionId: string,
    kind: SummonedEntityKind,
  ) => SummonedEntityBlueprint | undefined;
};
