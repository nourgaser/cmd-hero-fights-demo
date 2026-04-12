import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";

const BASTION_STANCE_DEFENSE_BONUS = 3;

export const BASTION_STANCE_CARD = {
  id: "card.commander-x.bastion-stance",
  name: "Bastion Stance",
  type: "ability",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 5,
  targeting: "none",
  tags: [],
  summaryText: {
    template: "Gain +{amount} armor and +{amount} magic resist until your next turn.",
    params: {
      amount: BASTION_STANCE_DEFENSE_BONUS,
    },
  },
  effects: [
    {
      id: "effect.bastion-stance.gain-armor",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "armor",
        amount: BASTION_STANCE_DEFENSE_BONUS,
        duration: "persistent",
        changeKind: "apply"
      },
      displayText: {
        template: "Gain {amount} armor.",
        params: {
          amount: BASTION_STANCE_DEFENSE_BONUS,
        },
      },
    },
    {
      id: "effect.bastion-stance.gain-mr",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "magicResist",
        amount: BASTION_STANCE_DEFENSE_BONUS,
        duration: "persistent",
        changeKind: "apply"
      },
      displayText: {
        template: "Gain {amount} magic resist.",
        params: {
          amount: BASTION_STANCE_DEFENSE_BONUS,
        },
      },
    },
    {
      id: "effect.bastion-stance.cleanup-listener",
      payload: {
        kind: "addListener",
        listenerId: "listener.bastion-stance.cleanup",
        eventKind: "turnStarted",
        conditions: [{ kind: "turnStartedIsListenerOwnerHero" }],
        lifetime: "once",
        effects: [
          {
            id: "effect.bastion-stance.remove-armor",
            payload: {
              kind: "modifyStat",
              target: "sourceOwnerHero",
              stat: "armor",
              amount: BASTION_STANCE_DEFENSE_BONUS,
              duration: "persistent",
              changeKind: "removeMatching",
            },
            displayText: {
              template:
                "Remove Bastion Stance +{amount} armor bonus at the start of your next turn.",
              params: {
                amount: BASTION_STANCE_DEFENSE_BONUS,
              },
            },
          },
          {
            id: "effect.bastion-stance.remove-mr",
            payload: {
              kind: "modifyStat",
              target: "sourceOwnerHero",
              stat: "magicResist",
              amount: BASTION_STANCE_DEFENSE_BONUS,
              duration: "persistent",
              changeKind: "removeMatching",
            },
            displayText: {
              template:
                "Remove Bastion Stance +{amount} magic resist bonus at the start of your next turn.",
              params: {
                amount: BASTION_STANCE_DEFENSE_BONUS,
              },
            },
          },
        ],
      },
      displayText: {
        template: "Remove Bastion Stance bonuses at the start of your next turn.",
      },
    },
  ],
} satisfies StrongCardDefinition;
