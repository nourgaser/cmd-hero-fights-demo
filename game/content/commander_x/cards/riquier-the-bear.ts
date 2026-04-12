import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";
import { KEYWORD_IDS } from "../../keywords";

const RIQUIER_COUNTERATTACK_MIN = 1;
const RIQUIER_COUNTERATTACK_MAX = 7;

export const RIQUIER_THE_BEAR_CARD = {
  id: "card.commander-x.riquier-the-bear",
  name: "Riquier the Bear",
  type: "companion",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 5,
  targeting: "none",
  keywords: [{ keywordId: KEYWORD_IDS.chivalry }, { keywordId: KEYWORD_IDS.vengeful }],
  tags: ["chivalry", "vengeful"],
  summaryText: {
    template: "Summon Riquier the Bear. Chivalry. Vengeful. Attack.",
  },
  effects: [
    {
      id: "effect.riquier.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "companion",
        entityDefinitionId: SUMMON_ENTITY_IDS.riquierTheBear,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        template: "Summon Riquier the Bear.",
      },
    },
    {
      id: "effect.riquier.vengeful-listener",
      payload: {
        kind: "addListener",
        listenerId: "listener.riquier.vengeful-counterattack",
        eventKind: "damageApplied",
        sourceBinding: "lastSummonedEntity",
        conditions: [
          { kind: "damageIsAttack" },
          { kind: "damageNotDodged" },
          { kind: "damageTargetIsListenerSource" },
        ],
        lifetime: "persistent",
        effects: [
          {
            id: "effect.riquier.vengeful-counterattack.damage",
            payload: {
              kind: "dealDamage",
              target: "triggeringSourceEntity",
              minimum: RIQUIER_COUNTERATTACK_MIN,
              maximum: RIQUIER_COUNTERATTACK_MAX,
              damageType: "physical",
              attackDamageScaling: 0.5,
              abilityPowerScaling: 0,
              armorScaling: 0,
              canBeDodged: true,
            },
            displayText: {
              template: "Riquier strikes back for {minimum}-{maximum} attack damage.",
              params: {
                minimum: RIQUIER_COUNTERATTACK_MIN,
                maximum: RIQUIER_COUNTERATTACK_MAX,
              },
            },
          },
        ],
      },
      displayText: {
        template: "When Riquier is attacked, he attacks back.",
      },
    },
  ],
} satisfies StrongCardDefinition;