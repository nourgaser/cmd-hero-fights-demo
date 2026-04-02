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
    text: "Summon Guard Sigil. Your hero has +1 armor and +1 magic resist while it remains.",
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
      id: "effect.guard-sigil.buff-armor-apply",
      payload: {
        kind: "gainArmor",
        target: "sourceOwnerHero",
        amount: 1,
      },
      displayText: {
        mode: "static",
        text: "Gain 1 armor while Guard Sigil is present.",
      },
    },
    {
      id: "effect.guard-sigil.buff-mr-apply",
      payload: {
        kind: "gainMagicResist",
        target: "sourceOwnerHero",
        amount: 1,
      },
      displayText: {
        mode: "static",
        text: "Gain 1 magic resist while Guard Sigil is present.",
      },
    },
    {
      id: "effect.guard-sigil.buff-cleanup-listener",
      payload: {
        kind: "addListener",
        listenerId: "listener.guard-sigil.cleanup",
        eventKind: "entityRemoved",
        sourceBinding: "lastSummonedEntity",
        conditions: [{ kind: "removedEntityIsListenerSource" }],
        lifetime: "once",
        effects: [
          {
            id: "effect.guard-sigil.buff-armor-remove",
            payload: {
              kind: "loseArmor",
              target: "sourceOwnerHero",
              amount: 1,
            },
            displayText: {
              mode: "static",
              text: "Lose Guard Sigil armor bonus when it leaves the battlefield.",
            },
          },
          {
            id: "effect.guard-sigil.buff-mr-remove",
            payload: {
              kind: "loseMagicResist",
              target: "sourceOwnerHero",
              amount: 1,
            },
            displayText: {
              mode: "static",
              text: "Lose Guard Sigil magic resist bonus when it leaves the battlefield.",
            },
          },
        ],
      },
      displayText: {
        mode: "static",
        text: "Register cleanup when Guard Sigil is removed.",
      },
    },
  ],
} satisfies CardDefinition;
