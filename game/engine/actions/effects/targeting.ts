import {
  type BattleEvent,
  type EffectTargetSelector,
  type EntityId,
  type HeroEntityState,
  type PlayCardAction,
  type BattleState,
} from "../../../shared/models";
import { type BattleRng } from "../../core/rng";
import { resolveAdjacentAllyEntityIds } from "../../battlefield/adjacency";

export function targetEntityIdsFromSelector(options: {
  selector: EffectTargetSelector;
  action: PlayCardAction;
  actorHero: HeroEntityState;
  state: BattleState;
  triggerEvent?: BattleEvent;
  effectSourceEntityId?: EntityId;
  battleRng?: BattleRng;
}): EntityId[] {
  const { selector, action, actorHero, state, triggerEvent, effectSourceEntityId, battleRng } = options;

  switch (selector) {
    case "none":
      return [];
    case "selfHero":
    case "sourceOwnerHero":
      return [actorHero.entityId];
    case "randomSourceOwnerAlly": {
      const allies = Object.values(state.entitiesById)
        .filter((entity) =>
          entity.kind === "hero"
            ? entity.entityId === actorHero.entityId
            : entity.ownerHeroEntityId === actorHero.entityId,
        )
        .map((entity) => entity.entityId)
        .sort((a, b) => a.localeCompare(b));
      if (allies.length === 0) {
        return [];
      }

      const randomIndex = battleRng ? battleRng.nextIntInclusive(0, allies.length - 1) : 0;
      return [allies[randomIndex]!];
    }
    case "sourceOwnerAllies":
      return Object.values(state.entitiesById)
        .filter((entity) => {
          if (entity.kind === "hero") {
            return entity.entityId === actorHero.entityId;
          }

          return entity.ownerHeroEntityId === actorHero.entityId;
        })
        .map((entity) => entity.entityId)
        .sort((a, b) => a.localeCompare(b));
    case "sourceOwnerHeroAndCompanions":
      return Object.values(state.entitiesById)
        .filter((entity) =>
          entity.kind === "hero"
            ? entity.entityId === actorHero.entityId
            : entity.kind === "companion" && entity.ownerHeroEntityId === actorHero.entityId,
        )
        .map((entity) => entity.entityId)
        .sort((a, b) => a.localeCompare(b));
    case "sourceEntity":
      return effectSourceEntityId ? [effectSourceEntityId] : [];
    case "sourceEntityAdjacentAllies": {
      if (!effectSourceEntityId) {
        return [];
      }

      return resolveAdjacentAllyEntityIds({
        state,
        targetEntityId: effectSourceEntityId,
      });
    }
    case "selectedEnemy": {
      const selected = action.selection.targetEntityId;
      if (!selected) {
        return [];
      }
      const selectedEntity = state.entitiesById[selected];
      if (!selectedEntity || selectedEntity.battlefieldSide === actorHero.battlefieldSide) {
        return [];
      }
      return [selected];
    }
    case "selectedAny": {
      const selected = action.selection.targetEntityId;
      return selected && state.entitiesById[selected] ? [selected] : [];
    }
    case "selectedAlly": {
      const selected = action.selection.targetEntityId;
      if (!selected) {
        return [];
      }
      const selectedEntity = state.entitiesById[selected];
      if (!selectedEntity || selectedEntity.battlefieldSide !== actorHero.battlefieldSide) {
        return [];
      }
      return [selected];
    }
    case "triggeringTarget": {
      return triggerEvent && "targetEntityId" in triggerEvent && triggerEvent.targetEntityId ? [triggerEvent.targetEntityId] : [];
    }
    case "triggeringSourceEntity": {
      return triggerEvent && "sourceEntityId" in triggerEvent && triggerEvent.sourceEntityId ? [triggerEvent.sourceEntityId] : [];
    }
    default:
      return [];
  }
}

export function targetEntityIdFromSelector(options: {
  selector: EffectTargetSelector;
  action: PlayCardAction;
  actorHero: HeroEntityState;
  state: BattleState;
  triggerEvent?: BattleEvent;
  effectSourceEntityId?: EntityId;
  battleRng?: BattleRng;
}): EntityId | undefined {
  return targetEntityIdsFromSelector(options)[0];
}
