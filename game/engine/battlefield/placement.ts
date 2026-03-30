import {
  type BattleState,
  type EntityFootprint,
  type EntityId,
  type Position,
  footprintFits,
  footprintIsOnSide,
} from "../../shared/models";

export type PlacementValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validatePlacementForHeroSide(options: {
  state: BattleState;
  heroEntityId: EntityId;
  anchorPosition: Position;
  footprint: EntityFootprint;
}): PlacementValidationResult {
  const { state, heroEntityId, anchorPosition, footprint } = options;
  const entity = state.entitiesById[heroEntityId];

  if (!entity || entity.kind !== "hero") {
    return { ok: false, reason: "Acting hero entity was not found." };
  }

  if (!footprintFits(state.battlefieldOccupancy, anchorPosition, footprint)) {
    return { ok: false, reason: "Selected summon position is not empty or outside battlefield bounds." };
  }

  if (
    !footprintIsOnSide(
      state.battlefieldOccupancy,
      anchorPosition,
      footprint,
      entity.battlefieldSide,
    )
  ) {
    return { ok: false, reason: "Summons must be placed fully on the acting hero side." };
  }

  return { ok: true };
}
