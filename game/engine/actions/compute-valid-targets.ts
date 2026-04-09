import type {
  BattleState,
  CardDefinition,
  EntityId,
  HeroEntityState,
} from "../../shared/models";

/**
 * Compute valid target entity IDs for a card based on the card's targeting requirement
 * and the current battle state.
 *
 * Returns an empty array if the card requires no targeting (targeting === "none").
 * Otherwise returns all valid entities based on the card's targeting type.
 */
export function computeValidTargetsForCard(options: {
  cardDef: CardDefinition;
  actorHero: HeroEntityState;
  state: BattleState;
}): EntityId[] {
  const { cardDef, actorHero, state } = options;

  // If card doesn't require targeting, return empty list
  if (cardDef.targeting === "none") {
    return [];
  }

  const validTargets: EntityId[] = [];
  const allEntities = Object.values(state.entitiesById);

  if (cardDef.targeting === "selectedEnemy") {
    // Only enemies (opposite side)
    for (const entity of allEntities) {
      if (entity.battlefieldSide !== actorHero.battlefieldSide) {
        validTargets.push(entity.entityId);
      }
    }
  } else if (cardDef.targeting === "selectedAny") {
    // Any entity on the battlefield
    for (const entity of allEntities) {
      validTargets.push(entity.entityId);
    }
  } else if (cardDef.targeting === "selectedAnyExceptEnemyHero") {
    // Any entity except the enemy hero
    for (const entity of allEntities) {
      const isEnemyHero = entity.kind === "hero" && entity.battlefieldSide !== actorHero.battlefieldSide;
      if (!isEnemyHero) {
        validTargets.push(entity.entityId);
      }
    }
  } else if (cardDef.targeting === "selectedAlly") {
    // Only allies (same side)
    for (const entity of allEntities) {
      if (entity.battlefieldSide === actorHero.battlefieldSide) {
        validTargets.push(entity.entityId);
      }
    }
  } else if (cardDef.targeting === "selectedAllyCompanion") {
    // Only allied companions
    for (const entity of allEntities) {
      if (entity.battlefieldSide === actorHero.battlefieldSide && entity.kind === "companion") {
        validTargets.push(entity.entityId);
      }
    }
  }

  return validTargets;
}
