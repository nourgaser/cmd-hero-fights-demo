import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

export const GUARD_SIGIL_CARD = {
  id: "card.commander-x.guard-sigil",
  name: "Guard Sigil",
  type: "totem",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 3,
  targeting: "none",
  tags: [],
  summaryText: {
    mode: "template",
    template: "Summon Guard Sigil. Your hero has +{amount} armor and +{amount} magic resist while it remains.",
    params: {
      amount: 1,
    },
  },
  effects: [
    {
      id: "effect.guard-sigil.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "totem",
        entityDefinitionId: SUMMON_ENTITY_IDS.guardSigil,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        mode: "static",
        text: "Summon Guard Sigil.",
      },
    },
    {
      id: "effect.guard-sigil.buff-armor-while-source-present",
      payload: {
        kind: "modifyArmorWhileSourcePresent",
        target: "sourceOwnerHero",
        amount: 1,
        sourceBinding: "lastSummonedEntity",
      },
      displayText: {
        mode: "template",
        template: "Gain {amount} armor while Guard Sigil is present.",
        params: {
          amount: 1,
        },
      },
    },
    {
      id: "effect.guard-sigil.buff-mr-while-source-present",
      payload: {
        kind: "modifyMagicResistWhileSourcePresent",
        target: "sourceOwnerHero",
        amount: 1,
        sourceBinding: "lastSummonedEntity",
      },
      displayText: {
        mode: "template",
        template: "Gain {amount} magic resist while Guard Sigil is present.",
        params: {
          amount: 1,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;
