import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

const BANNER_OF_X_MOVE_CAPACITY_BONUS = 1;

export const BANNER_OF_X_CARD = {
  id: "card.commander-x.banner-of-x",
  name: "Banner of X",
  type: "totem",
  rarity: "rare",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 7,
  targeting: "none",
  tags: ["buff"],
  summaryText: {
    template: "Summon Banner of X. Your allies gain +{amount} max moves per turn while it remains.",
    params: {
      amount: BANNER_OF_X_MOVE_CAPACITY_BONUS,
    },
  },
  effects: [
    {
      id: "effect.banner-of-x.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "totem",
        entityDefinitionId: SUMMON_ENTITY_IDS.bannerOfX,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        template: "Summon Banner of X.",
      },
    },
    {
      id: "effect.banner-of-x.move-capacity-bonus",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHeroAndCompanions",
        stat: "moveCapacity",
        amount: BANNER_OF_X_MOVE_CAPACITY_BONUS,
        duration: "untilSourceRemoved",
        changeKind: "apply",
        sourceBinding: "lastSummonedEntity",
      },
      displayText: {
        template: "Your allies gain +{amount} max moves per turn while Banner of X remains.",
        params: {
          amount: BANNER_OF_X_MOVE_CAPACITY_BONUS,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;