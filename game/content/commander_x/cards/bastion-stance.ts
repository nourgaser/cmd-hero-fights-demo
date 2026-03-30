import type { CardDefinition } from "../../../shared/models";
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
    mode: "static",
    text: "Gain +1 armor and +1 magic resist.",
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
        mode: "static",
        text: "Gain 1 armor.",
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
        mode: "static",
        text: "Gain 1 magic resist.",
      },
    },
  ],
} satisfies CardDefinition;
