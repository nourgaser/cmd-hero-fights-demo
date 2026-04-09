import {
  type BattleEvent,
  type EffectTargetSelector,
  type EntityId,
  type HeroEntityState,
  type PlayCardAction,
  type BattleState,
} from "../../../shared/models";
import { type BattleRng } from "../../core/rng";

export function targetEntityIdFromSelector(options: {
  selector: EffectTargetSelector;
  action: PlayCardAction;
  actorHero: HeroEntityState;
  state: BattleState;
  triggerEvent?: BattleEvent;
  effectSourceEntityId?: EntityId;
  battleRng?: BattleRng;
}): EntityId | undefined {
  const { selector, action, actorHero, state, triggerEvent, effectSourceEntityId, battleRng } = options;

  switch (selector) {
    case "none":
      return undefined;
    case "selfHero":
    case "sourceOwnerHero":
      return actorHero.entityId;
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
        return undefined;
      }

      const randomIndex = battleRng
        ? battleRng.nextIntInclusive(0, allies.length - 1)
        : 0;

      return allies[randomIndex];
    }
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
