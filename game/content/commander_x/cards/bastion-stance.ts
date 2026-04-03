import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";

export const BASTION_STANCE_CARD = {
  id: "card.commander-x.bastion-stance",
  name: "Bastion Stance",
  type: "ability",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 1,
  targeting: "none",
  tags: [],
  summaryText: {
    mode: "template",
    template: "Gain +{amount} armor and +{amount} magic resist until your next turn.",
    params: {
      amount: 1,
    },
  },
  effects: [
    {
      id: "effect.bastion-stance.gain-armor",
      payload: {
        kind: "gainArmor",
        target: "sourceOwnerHero",
        amount: 1,
      },
      displayText: {
        mode: "template",
        template: "Gain {amount} armor.",
        params: {
          amount: 1,
        },
      },
    },
    {
      id: "effect.bastion-stance.gain-mr",
      payload: {
        kind: "gainMagicResist",
        target: "sourceOwnerHero",
        amount: 1,
      },
      displayText: {
        mode: "template",
        template: "Gain {amount} magic resist.",
        params: {
          amount: 1,
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
              kind: "loseArmor",
              target: "sourceOwnerHero",
              amount: 1,
            },
            displayText: {
              mode: "static",
              text: "Remove Bastion Stance armor bonus at the start of your next turn.",
            },
          },
          {
            id: "effect.bastion-stance.remove-mr",
            payload: {
              kind: "loseMagicResist",
              target: "sourceOwnerHero",
              amount: 1,
            },
            displayText: {
              mode: "static",
              text: "Remove Bastion Stance magic resist bonus at the start of your next turn.",
            },
          },
        ],
      },
      displayText: {
        mode: "static",
        text: "Remove Bastion Stance bonuses at the start of your next turn.",
      },
    },
  ],
} satisfies StrongCardDefinition;
