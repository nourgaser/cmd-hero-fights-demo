import {
  type BattleEvent,
  type EffectTargetSelector,
  type EntityId,
  type HeroEntityState,
  type PlayCardAction,
  type BattleState,
} from "../../../shared/models";

export function targetEntityIdFromSelector(options: {
  selector: EffectTargetSelector;
  action: PlayCardAction;
  actorHero: HeroEntityState;
  state: BattleState;
  triggerEvent?: BattleEvent;
  effectSourceEntityId?: EntityId;
}): EntityId | undefined {
  const { selector, action, actorHero, state, triggerEvent, effectSourceEntityId } = options;

  switch (selector) {
    case "none":
      return undefined;
    case "selfHero":
    case "sourceOwnerHero":
      return actorHero.entityId;
    case "sourceEntity":
      return effectSourceEntityId;
    case "selectedEnemy": {
      const selected = action.selection.targetEntityId;
      if (!selected) {
        return undefined;
      }
      const selectedEntity = state.entitiesById[selected];
      if (!selectedEntity) {
        return undefined;
      }
      if (selectedEntity.battlefieldSide === actorHero.battlefieldSide) {
        return undefined;
      }
      return selected;
    }
    case "selectedAny": {
      const selected = action.selection.targetEntityId;
      if (!selected) {
        return undefined;
      }
      return state.entitiesById[selected] ? selected : undefined;
    }
    case "triggeringTarget": {
      return triggerEvent && "targetEntityId" in triggerEvent ? triggerEvent.targetEntityId : undefined;
    }
    default:
      return undefined;
  }
}
