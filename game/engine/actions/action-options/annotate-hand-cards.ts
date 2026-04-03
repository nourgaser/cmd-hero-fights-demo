import {
  type BattleState,
  type CardDefinition,
  type EntityFootprint,
  type HeroEntityState,
  isCardCastConditionMet,
} from "../../../shared/models";
import { computeValidTargetsForCard } from "../compute-valid-targets";
import { resolveValidPlacementPositions } from "./resolve-valid-placement-positions";

export function annotateHeroHandCards(options: {
  state: BattleState;
  actorHero: HeroEntityState;
  isActiveHero: boolean;
  cardDefinitionsById: Record<string, CardDefinition>;
  resolveSummonFootprint?: (entityDefinitionId: string) => EntityFootprint | undefined;
}): HeroEntityState["handCards"] {
  const { state, actorHero, isActiveHero, cardDefinitionsById, resolveSummonFootprint } = options;

  return actorHero.handCards.map((handCard) => {
    const baseHandCard = {
      id: handCard.id,
      cardDefinitionId: handCard.cardDefinitionId,
    };

    if (!isActiveHero) {
      return baseHandCard;
    }

    const cardDef = cardDefinitionsById[handCard.cardDefinitionId];
    if (!cardDef) {
      return baseHandCard;
    }

    const validTargetEntityIds =
      cardDef.targeting === "none"
        ? undefined
        : computeValidTargetsForCard({
            cardDef,
            actorHero,
            state,
          });

    const validPlacementPositions = resolveValidPlacementPositions({
      state,
      cardDef,
      actorHeroEntityId: actorHero.entityId,
      resolveSummonFootprint,
    });

    const hasTargetingRequirement = cardDef.targeting !== "none";
    const hasPlacementRequirement = validPlacementPositions.length > 0;
    const hasValidTargetSelection = !hasTargetingRequirement || (validTargetEntityIds?.length ?? 0) > 0;
    const hasValidPlacementSelection =
      !cardDef.effects.some((effect) => effect.payload.kind === "summonEntity") ||
      hasPlacementRequirement;
    const hasMoveCost = actorHero.movePoints >= cardDef.moveCost;
    const hasCastCondition =
      !cardDef.castCondition ||
      isCardCastConditionMet({
        condition: cardDef.castCondition,
        currentHealth: actorHero.currentHealth,
      });
    const isPlayable =
      hasMoveCost && hasValidTargetSelection && hasValidPlacementSelection && hasCastCondition;

    return {
      ...baseHandCard,
      validTargetEntityIds,
      validPlacementPositions:
        validPlacementPositions.length > 0 ? validPlacementPositions : undefined,
      isPlayable,
    };
  });
}
