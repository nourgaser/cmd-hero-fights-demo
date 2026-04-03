import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

export const WAR_STANDARD_CARD = {
  id: "card.commander-x.war-standard",
  name: "War Standard",
  type: "totem",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 2,
  targeting: "none",
  tags: ["buff"],
  summaryText: {
    mode: "static",
    text: "Summon War Standard. Your hero has +1 AD while it remains.",
  },
  effects: [
    {
      id: "effect.war-standard.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "totem",
        entityDefinitionId: SUMMON_ENTITY_IDS.warStandard,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        mode: "static",
        text: "Summon War Standard.",
      },
    },
    {
      id: "effect.war-standard.buff-apply",
      payload: {
        kind: "gainAttackDamage",
        target: "sourceOwnerHero",
        amount: 1,
      },
      displayText: {
        mode: "static",
        text: "Gain +1 attack damage while War Standard is present.",
      },
    },
    {
      id: "effect.war-standard.buff-cleanup-listener",
      payload: {
        kind: "addListener",
        listenerId: "listener.war-standard.cleanup",
        eventKind: "entityRemoved",
        sourceBinding: "lastSummonedEntity",
        conditions: [{ kind: "removedEntityIsListenerSource" }],
        lifetime: "once",
        effects: [
          {
            id: "effect.war-standard.buff-remove",
            payload: {
              kind: "loseAttackDamage",
              target: "sourceOwnerHero",
              amount: 1,
            },
            displayText: {
              mode: "static",
              text: "Lose War Standard bonus when it leaves the battlefield.",
            },
          },
        ],
      },
      displayText: {
        mode: "static",
        text: "Register cleanup when War Standard is removed.",
      },
    },
  ],
} satisfies StrongCardDefinition;
