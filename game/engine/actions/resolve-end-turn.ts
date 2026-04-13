import {
  type BattleEvent,
  type BattleState,
  type EndTurnAction,
} from "../../shared/models";
import {
  MOVE_POINTS_CAP,
  HARD_HAND_SIZE_LIMIT,
  TURN_START_SOFT_HAND_SIZE,
} from "../../shared/game-constants";
import { resolveActiveActorHeroForAction } from "./shared-validation";
import { cleanupExpiredAuras } from "../core/aura";
import { resolveEffectiveNumber } from "../core/number-resolver";

export type ResolveEndTurnResult =
  | {
      ok: true;
      state: BattleState;
      events: BattleEvent[];
      nextSequence: number;
      resultMessage: string;
    }
  | {
      ok: false;
      state: BattleState;
      reason: string;
    };

function getOtherHeroEntityId(state: BattleState, heroEntityId: string): string | undefined {
  const [firstHeroId, secondHeroId] = state.heroEntityIds;
  if (firstHeroId === heroEntityId) {
    return secondHeroId;
  }
  if (secondHeroId === heroEntityId) {
    return firstHeroId;
  }

  return undefined;
}

export function resolveEndTurnAction(options: {
  state: BattleState;
  action: EndTurnAction;
  nextSequence: number;
}): ResolveEndTurnResult {
  const { state, action, nextSequence } = options;

  const endingHeroResolution = resolveActiveActorHeroForAction({
    state,
    actorHeroEntityId: action.actorHeroEntityId,
    notFoundReason: "Ending hero was not found.",
    inactiveReason: "Only the active hero can end the turn.",
  });
  if (!endingHeroResolution.ok) {
    return {
      ok: false,
      state,
      reason: endingHeroResolution.reason,
    };
  }
  const endingHero = endingHeroResolution.actorHero;

  const nextHeroEntityId = getOtherHeroEntityId(state, endingHero.entityId);
  if (!nextHeroEntityId) {
    return {
      ok: false,
      state,
      reason: "Could not resolve next active hero.",
    };
  }

  const nextHero = state.entitiesById[nextHeroEntityId];
  if (!nextHero || nextHero.kind !== "hero") {
    return {
      ok: false,
      state,
      reason: "Next active hero was not found.",
    };
  }

  const canDrawOneCard =
    nextHero.handCards.length < TURN_START_SOFT_HAND_SIZE &&
    nextHero.handCards.length < HARD_HAND_SIZE_LIMIT &&
    nextHero.deckCardIds.length > 0;
  const drawCount = canDrawOneCard ? 1 : 0;
  const drawnCardIds = nextHero.deckCardIds.slice(0, drawCount);
  const remainingDeck = nextHero.deckCardIds.slice(drawCount);
  const nextTurnMaxMovePoints = Math.min(nextHero.maxMovePoints + 1, MOVE_POINTS_CAP);

  const refreshedNextHero = {
    ...nextHero,
    maxMovePoints: nextTurnMaxMovePoints,
    movePoints: nextTurnMaxMovePoints,
    deckCardIds: remainingDeck,
    handCards: [
      ...nextHero.handCards,
      ...drawnCardIds.map((cardDefinitionId, index) => ({
        id: `${nextHero.entityId}:hand:turn${state.turn.turnNumber + 1}:${index + 1}`,
        cardDefinitionId,
      })),
    ],
  };

  const refreshedSummonedEntries = Object.fromEntries(
    Object.entries(state.entitiesById).map(([entityId, entity]) => {
      if (entity.kind === "hero") {
        return [entityId, entity];
      }

      if (entity.ownerHeroEntityId !== nextHero.entityId) {
        return [entityId, entity];
      }

      if (entity.kind === "totem") {
        return [entityId, entity];
      }

      const moveRefreshIntervalTurns = Math.max(1, entity.moveRefreshIntervalTurns ?? 1);
      const ownerTurnsUntilMoveRefresh = Math.max(0, entity.ownerTurnsUntilMoveRefresh ?? 0);
      if (ownerTurnsUntilMoveRefresh > 0) {
        return [
          entityId,
          {
            ...entity,
            remainingMoves: 0,
            moveRefreshIntervalTurns,
            ownerTurnsUntilMoveRefresh: ownerTurnsUntilMoveRefresh - 1,
          },
        ];
      }

      return [
        entityId,
        {
          ...entity,
          remainingMoves: Math.min(
            resolveEffectiveNumber({
              state,
              targetEntityId: entityId,
              propertyPath: "moveCapacity",
              baseValue: entity.maxMovesPerTurn,
              clampMin: 0,
            }).effectiveValue,
            MOVE_POINTS_CAP,
          ),
          moveRefreshIntervalTurns,
          ownerTurnsUntilMoveRefresh: Math.max(0, moveRefreshIntervalTurns - 1),
        },
      ];
    }),
  );

  let sequence = nextSequence;
  const events: BattleEvent[] = [];

  events.push({
    kind: "turnEnded",
    sequence,
    endingHeroEntityId: endingHero.entityId,
    nextActiveHeroEntityId: nextHero.entityId,
  });
  sequence += 1;

  const nextState: BattleState = {
    ...state,
    turn: {
      turnNumber: state.turn.turnNumber + 1,
      activeHeroEntityId: nextHero.entityId,
      pressLuckUsedThisTurn: false,
      damageTakenThisTurnByHeroEntityId: state.turn.damageTakenThisTurnByHeroEntityId,
    },
    entitiesById: {
      ...refreshedSummonedEntries,
      [nextHero.entityId]: refreshedNextHero,
    },
  };

  const effectiveNextHeroMoveCapacity = resolveEffectiveNumber({
    state: nextState,
    targetEntityId: nextHero.entityId,
    propertyPath: "moveCapacity",
    baseValue: refreshedNextHero.maxMovePoints,
    clampMin: 0,
  }).effectiveValue;

  const nextStateWithEffectiveHeroMoves: BattleState = {
    ...nextState,
    entitiesById: {
      ...nextState.entitiesById,
      [nextHero.entityId]: {
        ...refreshedNextHero,
        movePoints: Math.min(effectiveNextHeroMoveCapacity, MOVE_POINTS_CAP),
      },
    },
  };

  const auraCleanup = cleanupExpiredAuras(
    nextStateWithEffectiveHeroMoves,
    nextStateWithEffectiveHeroMoves.turn.turnNumber,
  );
  const nextStateWithAuraCleanup = auraCleanup.state;

  for (const aura of auraCleanup.expiredAuras) {
    events.push({
      kind: "auraExpired",
      sequence,
      auraId: aura.id,
      ownerHeroEntityId: aura.ownerHeroEntityId,
      auraKind: aura.kind,
      expiredOnTurnNumber: nextStateWithAuraCleanup.turn.turnNumber,
    });
    sequence += 1;
  }

  events.push({
    kind: "turnStarted",
    sequence,
    activeHeroEntityId: nextHero.entityId,
    turnNumber: nextStateWithAuraCleanup.turn.turnNumber,
  });
  sequence += 1;

  events.push({
    kind: "actionResolved",
    sequence,
    action,
  });
  sequence += 1;

  return {
    ok: true,
    state: nextStateWithAuraCleanup,
    events,
    nextSequence: sequence,
    resultMessage: drawCount > 0
      ? `Turn ended. Drew ${drawCount} card for ${nextHero.entityId}.`
      : `Turn ended. No card drawn.`,
  };
}
