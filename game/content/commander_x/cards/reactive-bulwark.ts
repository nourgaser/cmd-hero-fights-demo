import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";
import { KEYWORD_IDS } from "../../keywords";
import {
  REACTIVE_BULWARK_AURA_DURATION_TURNS,
  REACTIVE_BULWARK_AURA_KIND,
  REACTIVE_BULWARK_AMPLIFIED_RESISTANCE_BONUS,
  REACTIVE_BULWARK_BASE_RESISTANCE_BONUS,
} from "../../../shared/models/aura";

export const REACTIVE_BULWARK_CARD = {
  id: "card.commander-x.reactive-bulwark",
  name: "Reactive Bulwark",
  type: "ability",
  rarity: "rare",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 7,
  targeting: "none",
  keywords: [{ keywordId: KEYWORD_IDS.aura }],
  tags: ["buff"],
  summaryText: {
    template:
      "Aura: after taking damage for the first time in a turn, gain +{baseBonus} resistance until end of turn. Amplified: +{amplifiedBonus} instead.",
    params: {
      baseBonus: REACTIVE_BULWARK_BASE_RESISTANCE_BONUS,
      amplifiedBonus: REACTIVE_BULWARK_AMPLIFIED_RESISTANCE_BONUS,
    },
  },
  effects: [
    {
      id: "effect.reactive-bulwark.apply-aura",
      payload: {
        kind: "applyAura",
        target: "sourceOwnerHero",
        auraKind: REACTIVE_BULWARK_AURA_KIND,
        durationTurns: REACTIVE_BULWARK_AURA_DURATION_TURNS,
        baseResistanceBonus: REACTIVE_BULWARK_BASE_RESISTANCE_BONUS,
        amplifiedResistanceBonus: REACTIVE_BULWARK_AMPLIFIED_RESISTANCE_BONUS,
      },
      displayText: {
        template:
          "Gain an aura for {duration} turns. After taking damage for the first time in a turn, gain +{baseBonus} resistance until end of turn. Amplified: +{amplifiedBonus} instead.",
        params: {
          duration: REACTIVE_BULWARK_AURA_DURATION_TURNS,
          baseBonus: REACTIVE_BULWARK_BASE_RESISTANCE_BONUS,
          amplifiedBonus: REACTIVE_BULWARK_AMPLIFIED_RESISTANCE_BONUS,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;