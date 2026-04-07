import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

const GUARD_SIGIL_DEFENSE_BONUS = 1;

export const GUARD_SIGIL_CARD = {
  id: "card.commander-x.guard-sigil",
  name: "Guard Sigil",
  type: "totem",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 5,
  targeting: "none",
  tags: [],
  summaryText: {
    template: "Summon Guard Sigil. Your hero has +{amount} armor and +{amount} magic resist while it remains.",
    params: {
      amount: GUARD_SIGIL_DEFENSE_BONUS,
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
        template: "Summon Guard Sigil.",
      },
    },
    {
      id: "effect.guard-sigil.buff-armor-while-source-present",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "armor",
        amount: GUARD_SIGIL_DEFENSE_BONUS,
        duration: "untilSourceRemoved",
        changeKind: "apply",
        sourceBinding: "lastSummonedEntity",
      },
      displayText: {
        template: "Gain {amount} armor while Guard Sigil is present.",
        params: {
          amount: GUARD_SIGIL_DEFENSE_BONUS,
        },
      },
    },
    {
      id: "effect.guard-sigil.buff-mr-while-source-present",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "magicResist",
        amount: GUARD_SIGIL_DEFENSE_BONUS,
        duration: "untilSourceRemoved",
        changeKind: "apply",
        sourceBinding: "lastSummonedEntity",
      },
      displayText: {
        template: "Gain {amount} magic resist while Guard Sigil is present.",
        params: {
          amount: GUARD_SIGIL_DEFENSE_BONUS,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;
