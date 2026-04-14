import {
  GAME_CONTENT_REGISTRY,
} from "./content/index";
import { createBattle, type CreatedBattle } from "./engine/core/create-battle";
import {
  resolveAction,
  type ResolveActionResult,
} from "./engine/actions/resolve-action";
import { resolveEffectiveNumber } from "./engine/core/number-resolver";
import { type BattleRng, type BattleRngCheckpoint, createBattleRngFromCheckpoint } from "./engine/core/rng";

export {
  createBattle,
  resolveAction,
  resolveEffectiveNumber,
  createBattleRngFromCheckpoint,
  GAME_CONTENT_REGISTRY,
};

export type { CreatedBattle, ResolveActionResult };
export type { BattleRng, BattleRngCheckpoint };
