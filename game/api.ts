import {
  CARD_DEFINITIONS_BY_ID,
  HERO_DEFINITIONS_BY_ID,
  KEYWORD_DEFINITIONS_BY_ID,
  resolveEntityActiveProfile,
  resolveHeroInitialListeners,
  resolveSummonFootprint,
  resolveSummonedEntityBlueprint,
} from "./content";
import {
  createBattle as createBattleCore,
  type CreateBattleInput,
  type CreatedBattle,
} from "./engine/core/create-battle";
import {
  resolveAction as resolveActionCore,
  type ResolveActionResult,
} from "./engine/actions/resolve-action";
import { resolveEffectiveNumber } from "./engine/core/number-resolver";
import type { BattleAction, BattleState } from "./shared/models";
import {
  advanceBattleRngSteps,
  createBattleRng,
  createBattleRngFromCheckpoint,
  type BattleRng,
  type BattleRngCheckpoint,
} from "./engine/core/rng";

export type GameCreateBattleInput = CreateBattleInput;

export type GameResolveActionInput = {
  state: BattleState;
  action: BattleAction;
  nextSequence: number;
  battleRng: BattleRng;
  createSummonedEntityId: (context: {
    ownerHeroEntityId: string;
    entityDefinitionId: string;
    sequence: number;
  }) => string;
};

export type GameApi = {
  cardsById: typeof CARD_DEFINITIONS_BY_ID;
  heroesById: typeof HERO_DEFINITIONS_BY_ID;
  keywordsById: typeof KEYWORD_DEFINITIONS_BY_ID;
  resolveSummonedEntityBlueprint: typeof resolveSummonedEntityBlueprint;
  resolveEntityActiveProfile: typeof resolveEntityActiveProfile;
  resolveEffectiveNumber(input: {
    state: BattleState;
    targetEntityId: string;
    propertyPath: string;
    baseValue: number;
    clampMin?: number;
    clampMax?: number;
  }): ReturnType<typeof resolveEffectiveNumber>;
  createBattle(input: GameCreateBattleInput): CreatedBattle;
  createBattleRng(seed: string): BattleRng;
  createBattleRngFromCheckpoint(checkpoint: BattleRngCheckpoint): BattleRng;
  advanceBattleRngSteps(battleRng: BattleRng, steps: number): void;
  resolveAction(input: GameResolveActionInput): ResolveActionResult;
};

export function createGameApi(): GameApi {
  return {
    cardsById: CARD_DEFINITIONS_BY_ID,
    heroesById: HERO_DEFINITIONS_BY_ID,
    keywordsById: KEYWORD_DEFINITIONS_BY_ID,
    resolveSummonedEntityBlueprint,
    resolveEntityActiveProfile,
    resolveEffectiveNumber(input) {
      return resolveEffectiveNumber(input);
    },
    createBattle(input) {
      return createBattleCore({
        ...input,
        cardDefinitionsById: CARD_DEFINITIONS_BY_ID,
        resolveSummonFootprint,
        resolveEntityActiveProfile,
        resolveHeroInitialListeners(context) {
          return resolveHeroInitialListeners({
            heroDefinitionId: context.hero.id,
            heroEntityId: context.heroEntityId,
          });
        },
      });
    },
    createBattleRng(seed) {
      return createBattleRng(seed);
    },
    createBattleRngFromCheckpoint(checkpoint) {
      return createBattleRngFromCheckpoint(checkpoint);
    },
    advanceBattleRngSteps(battleRng, steps) {
      advanceBattleRngSteps(battleRng, steps);
    },
    resolveAction(input) {
      return resolveActionCore({
        ...input,
        cardDefinitionsById: CARD_DEFINITIONS_BY_ID,
        heroDefinitionsById: HERO_DEFINITIONS_BY_ID,
        resolveSummonFootprint,
        resolveSummonedEntityBlueprint,
        resolveEntityActiveProfile,
      });
    },
  };
}

export {
  CARD_DEFINITIONS_BY_ID,
  HERO_DEFINITIONS_BY_ID,
  KEYWORD_DEFINITIONS_BY_ID,
  resolveSummonFootprint,
  resolveSummonedEntityBlueprint,
  resolveEntityActiveProfile,
  resolveHeroInitialListeners,
};

export type { CreatedBattle, ResolveActionResult };
export type { BattleRng, BattleRngCheckpoint };
