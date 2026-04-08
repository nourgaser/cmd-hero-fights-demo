import type { BattleState } from "../../shared/models";
import { REACTIVE_BULWARK_AURA_KIND } from "../../shared/models/aura";

export function createReactiveBulwarkAura(options: {
  ownerHeroEntityId: string;
  sourceEffectId: string;
  sequence: number;
  currentTurnNumber: number;
  durationTurns: number;
  baseResistanceBonus: number;
  amplifiedResistanceBonus: number;
}) {
  return {
    id: `aura.${options.sourceEffectId}.${options.sequence}`,
    kind: REACTIVE_BULWARK_AURA_KIND,
    ownerHeroEntityId: options.ownerHeroEntityId,
    sourceEffectId: options.sourceEffectId,
    expiresOnTurnNumber: options.currentTurnNumber + options.durationTurns,
    baseResistanceBonus: options.baseResistanceBonus,
    amplifiedResistanceBonus: options.amplifiedResistanceBonus,
  };
}

export function getActiveReactiveBulwarkAuraBonus(options: {
  state: BattleState;
  targetHeroEntityId: string;
}): number {
  const { state, targetHeroEntityId } = options;

  if (!state.turn.damageTakenThisTurnByHeroEntityId[targetHeroEntityId]) {
    return 0;
  }

  const activeAuras = state.activeAuras.filter(
    (aura) =>
      aura.kind === REACTIVE_BULWARK_AURA_KIND &&
      aura.ownerHeroEntityId === targetHeroEntityId &&
      aura.expiresOnTurnNumber > state.turn.turnNumber,
  );

  if (activeAuras.length === 0) {
    return 0;
  }

  return activeAuras.length >= 2 ? activeAuras[0]!.amplifiedResistanceBonus : activeAuras[0]!.baseResistanceBonus;
}

export function markHeroDamageTakenThisTurn(state: BattleState, heroEntityId: string): BattleState {
  if (state.turn.damageTakenThisTurnByHeroEntityId[heroEntityId]) {
    return state;
  }

  return {
    ...state,
    turn: {
      ...state.turn,
      damageTakenThisTurnByHeroEntityId: {
        ...state.turn.damageTakenThisTurnByHeroEntityId,
        [heroEntityId]: true,
      },
    },
  };
}

export function cleanupExpiredAuras(state: BattleState, turnNumber: number): {
  state: BattleState;
  expiredAuras: BattleState["activeAuras"];
} {
  const expiredAuras = state.activeAuras.filter((aura) => aura.expiresOnTurnNumber <= turnNumber);

  return {
    state: {
      ...state,
      activeAuras: state.activeAuras.filter((aura) => aura.expiresOnTurnNumber > turnNumber),
      turn: {
        ...state.turn,
        damageTakenThisTurnByHeroEntityId: {},
      },
    },
    expiredAuras,
  };
}