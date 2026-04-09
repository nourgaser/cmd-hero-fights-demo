import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

const EVERGROWTH_IDOL_INTERVAL = 5;
const EVERGROWTH_IDOL_STACK_BONUS = 1;

export const EVERGROWTH_IDOL_CARD = {
  id: "card.commander-x.evergrowth-idol",
  name: "Evergrowth Idol",
  type: "totem",
  rarity: "rare",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 4,
  targeting: "none",
  tags: ["buff"],
  summaryText: {
    template: "Summon Evergrowth Idol. Every {turns} turns, gain +{amount} attack damage, +{amount} armor, and +{amount} magic resist.",
    params: {
      turns: EVERGROWTH_IDOL_INTERVAL,
      amount: EVERGROWTH_IDOL_STACK_BONUS,
    },
  },
  effects: [
    {
      id: "effect.evergrowth-idol.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "totem",
        entityDefinitionId: SUMMON_ENTITY_IDS.evergrowthIdol,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        template: "Summon Evergrowth Idol.",
      },
    },
    {
      id: "effect.evergrowth-idol.periodic-growth-listener",
      payload: {
        kind: "addListener",
        listenerId: "listener.evergrowth-idol.periodic-growth",
        eventKind: "turnStarted",
        sourceBinding: "lastSummonedEntity",
        conditions: [
          { kind: "turnStartedIsListenerOwnerHero" },
          {
            kind: "turnStartedEveryNOwnerTurnsSinceListenerCreated",
            interval: EVERGROWTH_IDOL_INTERVAL,
          },
        ],
        lifetime: "persistent",
        effects: [
          {
            id: "effect.evergrowth-idol.gain-attack-damage",
            payload: {
              kind: "modifyStat",
              target: "sourceOwnerHero",
              stat: "attackDamage",
              amount: EVERGROWTH_IDOL_STACK_BONUS,
              duration: "persistent",
              changeKind: "apply",
              sourceBinding: "actorHero",
            },
            displayText: {
              template: "Gain +{amount} attack damage.",
              params: {
                amount: EVERGROWTH_IDOL_STACK_BONUS,
              },
            },
          },
          {
            id: "effect.evergrowth-idol.gain-armor",
            payload: {
              kind: "modifyStat",
              target: "sourceOwnerHero",
              stat: "armor",
              amount: EVERGROWTH_IDOL_STACK_BONUS,
              duration: "persistent",
              changeKind: "apply",
              sourceBinding: "actorHero",
            },
            displayText: {
              template: "Gain +{amount} armor.",
              params: {
                amount: EVERGROWTH_IDOL_STACK_BONUS,
              },
            },
          },
          {
            id: "effect.evergrowth-idol.gain-magic-resist",
            payload: {
              kind: "modifyStat",
              target: "sourceOwnerHero",
              stat: "magicResist",
              amount: EVERGROWTH_IDOL_STACK_BONUS,
              duration: "persistent",
              changeKind: "apply",
              sourceBinding: "actorHero",
            },
            displayText: {
              template: "Gain +{amount} magic resist.",
              params: {
                amount: EVERGROWTH_IDOL_STACK_BONUS,
              },
            },
          },
        ],
      },
      displayText: {
        template: "Every {turns} turns, gain +{amount} attack damage, +{amount} armor, and +{amount} magic resist while Evergrowth Idol remains.",
        params: {
          turns: EVERGROWTH_IDOL_INTERVAL,
          amount: EVERGROWTH_IDOL_STACK_BONUS,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;
