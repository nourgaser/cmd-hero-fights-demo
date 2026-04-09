import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";
import { KEYWORD_IDS } from "../../keywords";

const SHAMANIC_TITANIUM_PUMMELER_HEAVY_INTERVAL = 2;
const SHAMANIC_TITANIUM_PUMMELER_SHARPNESS = 2;

export const SHAMANIC_TITANIUM_PUMMELER_CARD = {
  id: "card.commander-x.shamanic-titanium-pummeler",
  name: "Shamanic Titanium Pummeler",
  type: "weapon",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 10,
  targeting: "none",
  keywords: [
    {
      keywordId: KEYWORD_IDS.heavy,
      params: {
        amount: SHAMANIC_TITANIUM_PUMMELER_HEAVY_INTERVAL,
      },
    },
    {
      keywordId: KEYWORD_IDS.sharpness,
      params: {
        amount: SHAMANIC_TITANIUM_PUMMELER_SHARPNESS,
      },
    },
  ],
  tags: [],
  summaryText: {
    template: "Summon Shamanic Titanium Pummeler.",
  },
  effects: [
    {
      id: "effect.shamanic-titanium-pummeler.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "weapon",
        entityDefinitionId: SUMMON_ENTITY_IDS.shamanicTitaniumPummeler,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        template: "Summon your weapon.",
      },
    },
  ],
} satisfies StrongCardDefinition;
