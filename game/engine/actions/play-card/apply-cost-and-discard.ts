import {
  type BattleState,
  type CardDefinition,
  type HeroEntityState,
  type HandCard,
} from "../../../shared/models";

export function applyPlayCardCostAndMoveToDiscard(options: {
  state: BattleState;
  actorHero: HeroEntityState;
  handCard: HandCard;
  card: CardDefinition;
}): BattleState {
  const { state, actorHero, handCard, card } = options;

  const actorAfterCost = {
    ...actorHero,
    movePoints: actorHero.movePoints - card.moveCost,
    handCards: actorHero.handCards.filter((entry) => entry.id !== handCard.id),
    discardCardIds: [...actorHero.discardCardIds, handCard.cardDefinitionId],
  };

  return {
    ...state,
    entitiesById: {
      ...state.entitiesById,
      [actorHero.entityId]: actorAfterCost,
    },
  };
}
