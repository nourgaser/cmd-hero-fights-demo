import {
    type BattleState,
    type CardDefinition,
    type PlayCardAction,
    SingleCellFootprint,
    isCardCastConditionMet,
} from "../../shared/models";
import { validatePlacementForHeroSide, type PlacementValidationResult } from "../battlefield/placement";
import { resolveActiveActorHeroForAction } from "./shared-validation";
import { type ContentRegistry } from "../core/content-registry";

export type PlayCardValidationResult =
    | { ok: true; card: CardDefinition }
    | { ok: false; reason: string };

export function validatePlayCardAction(options: {
    state: BattleState;
    action: PlayCardAction;
    registry: ContentRegistry;
}): PlayCardValidationResult {
    const { state, action, registry } = options;

    const actorResolution = resolveActiveActorHeroForAction({
        state,
        actorHeroEntityId: action.actorHeroEntityId,
        notFoundReason: "Acting hero was not found.",
        inactiveReason: "Only the active hero can play a card.",
    });
    if (!actorResolution.ok) {
        return { ok: false, reason: (actorResolution as { reason: string }).reason };
    }
    const actor = actorResolution.actorHero;

    const handCard = actor.handCards.find((entry) => entry.id === action.handCardId);
    if (!handCard) {
        return { ok: false, reason: "Selected hand card was not found on acting hero hand." };
    }

    const card = registry.cardsById[handCard.cardDefinitionId];
    if (!card) {
        return { ok: false, reason: "Card definition for hand card was not found." };
    }

    if (card.castCondition && !isCardCastConditionMet({ condition: card.castCondition, currentHealth: actor.currentHealth })) {
        return { ok: false, reason: `${card.name} can only be played when its cast condition is met.` };
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
            registry.resolveSummonFootprint(summonEffect.payload.entityDefinitionId) ?? SingleCellFootprint;

        const placementResult: PlacementValidationResult = validatePlacementForHeroSide({
            state,
            heroEntityId: actor.entityId,
            anchorPosition: action.selection.targetPosition,
            footprint,
        });

        if (!placementResult.ok) {
            return { ok: false, reason: (placementResult as { reason: string }).reason };
        }
    }

    return {
        ok: true,
        card,
    };
}
