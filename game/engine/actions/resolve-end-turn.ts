import {
  type BattleEvent,
  type BattleState,
  type EndTurnAction,
} from "../../shared/models";

const TURN_START_SOFT_HAND_SIZE = 4;
const HARD_HAND_SIZE_LIMIT = 7;

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

function otherHeroEntityId(state: BattleState, heroEntityId: string): string | undefined {
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

  const endingHero = state.entitiesById[action.actorHeroEntityId];
  if (!endingHero || endingHero.kind !== "hero") {
    return {
      ok: false,
      state,
      reason: "Ending hero was not found.",
    };
  }

  if (state.turn.activeHeroEntityId !== endingHero.entityId) {
    return {
      ok: false,
      state,
      reason: "Only the active hero can end the turn.",
    };
  }

  const nextHeroEntityId = otherHeroEntityId(state, endingHero.entityId);
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
  const nextTurnMaxMovePoints = nextHero.maxMovePoints + 1;

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

      return [
        entityId,
        {
          ...entity,
          remainingMoves: entity.maxMovesPerTurn,
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
    },
    entitiesById: {
      ...refreshedSummonedEntries,
      [nextHero.entityId]: refreshedNextHero,
    },
  };

  events.push({
    kind: "actionResolved",
    sequence,
    action,
  });
  sequence += 1;

  return {
    ok: true,
    state: nextState,
    events,
    nextSequence: sequence,
    resultMessage: drawCount > 0
      ? `Turn ended. Drew ${drawCount} card for ${nextHero.entityId}.`
      : `Turn ended. No card drawn.`,
  };
}
