import {
  type BattleState,
  type CardDefinition,
  type EntityFootprint,
  type Position,
  SingleCellFootprint,
} from "../../../shared/models";
import { validatePlacementForHeroSide } from "../../battlefield/placement";

export function resolveValidPlacementPositions(options: {
  state: BattleState;
  cardDef: CardDefinition;
  actorHeroEntityId: string;
  resolveSummonFootprint?: (entityDefinitionId: string) => EntityFootprint | undefined;
}): Position[] {
  const summonEffects = options.cardDef.effects.filter(
    (effect) => effect.payload.kind === "summonEntity",
  );

  if (summonEffects.length !== 1) {
    return [];
  }

  const summonEffect = summonEffects[0]!;
  if (summonEffect.payload.kind !== "summonEntity") {
    return [];
  }

  const footprint =
    options.resolveSummonFootprint?.(summonEffect.payload.entityDefinitionId) ?? SingleCellFootprint;

  const { rows, columns } = options.state.battlefieldOccupancy.dimensions;
  const validPositions: Position[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const anchorPosition = { row, column };
      const validation = validatePlacementForHeroSide({
        state: options.state,
        heroEntityId: options.actorHeroEntityId,
        anchorPosition,
        footprint,
      });
      if (validation.ok) {
        validPositions.push(anchorPosition);
      }
    }
  }

  return validPositions;
}
