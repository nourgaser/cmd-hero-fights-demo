import type { CardDefinition } from "../../../shared/models";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

export const JAQUEMIN_PATROL_CARD = {
  id: "card.commander-x.jaquemin-patrol",
  name: "Jaquemin the Patrol",
  type: "companion",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 6,
  targeting: "none",
  tags: ["chivalry"],
  summaryText: {
    mode: "static",
    text: "Summon Jaquemin the Patrol.",
  },
  effects: [
    {
      id: "effect.jaquemin.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "companion",
        entityDefinitionId: SUMMON_ENTITY_IDS.jaqueminPatrol,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        mode: "static",
        text: "Summon Jaquemin the Patrol.",
      },
    },
  ],
} satisfies CardDefinition;
