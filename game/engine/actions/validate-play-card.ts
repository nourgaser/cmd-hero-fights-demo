import {
    type BattleState,
    type CardDefinition,
    type EntityFootprint,
    type PlayCardAction,
    SingleCellFootprint,
} from "../../shared/models";
import { validatePlacementForHeroSide, type PlacementValidationResult } from "../battlefield/placement";

export type PlayCardValidationResult =
    | { ok: true; card: CardDefinition }
    | { ok: false; reason: string };

export function validatePlayCardAction(options: {
    state: BattleState;
    action: PlayCardAction;
    cardDefinitionsById: Record<string, CardDefinition>;
    resolveSummonFootprint?: (entityDefinitionId: string) => EntityFootprint | undefined;
}): PlayCardValidationResult {
    const { state, action, cardDefinitionsById, resolveSummonFootprint } = options;

    const actor = state.entitiesById[action.actorHeroEntityId];
    if (!actor || actor.kind !== "hero") {
        return { ok: false, reason: "Acting hero was not found." };
    }

    if (state.turn.activeHeroEntityId !== actor.entityId) {
        return { ok: false, reason: "Only the active hero can play a card." };
    }

    const handCard = actor.handCards.find((entry) => entry.id === action.handCardId);
    if (!handCard) {
        return { ok: false, reason: "Selected hand card was not found on acting hero hand." };
    }

    const card = cardDefinitionsById[handCard.cardDefinitionId];
    if (!card) {
        return { ok: false, reason: "Card definition for hand card was not found." };
    }

    if (actor.movePoints < card.moveCost) {
        return { ok: false, reason: "Not enough move points to play this card." };
    }

    const summonEffects = card.effects.filter(
        (effect) => effect.payload.kind === "summonEntity",
    );

    if (summonEffects.length === 0) { return { ok: true, card } };


    if (summonEffects.length > 1) {
        return {
            ok: false,
            reason: "A card with multiple summon effects is not supported by current placement selection input.",
        };
    }

    if (summonEffects.length === 1) {
        if (!action.selection.targetPosition) {
            return {
                ok: false,
                reason: "Summon card requires a selected empty target position.",
            };
        }

        const summonEffect = summonEffects[0]!;
        if (summonEffect.payload.kind !== "summonEntity") {
            return {
                ok: false,
                reason: "Invalid summon effect payload encountered during validation.",
            };
        }

        const footprint =
            resolveSummonFootprint?.(summonEffect.payload.entityDefinitionId) ?? SingleCellFootprint;

        const placementResult: PlacementValidationResult = validatePlacementForHeroSide({
            state,
            heroEntityId: actor.entityId,
            anchorPosition: action.selection.targetPosition,
            footprint,
        });

        if (!placementResult.ok) {
            return placementResult;
        }
    }

    return {
        ok: true,
        card,
    };
}
