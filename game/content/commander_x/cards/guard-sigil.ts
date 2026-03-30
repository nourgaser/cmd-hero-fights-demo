import type { CardDefinition } from "../../../shared/models";
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
    mode: "static",
    text: "Summon Guard Sigil.",
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
  ],
} satisfies CardDefinition;
