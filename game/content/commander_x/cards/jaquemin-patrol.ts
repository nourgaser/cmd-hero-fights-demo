import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

const JAQUEMIN_FOLLOW_UP_MIN = 2;
const JAQUEMIN_FOLLOW_UP_MAX = 4;

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
    template:
      "Summon Jaquemin the Patrol. Whenever you attack, it follows the same target.",
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
        template: "Summon Jaquemin the Patrol.",
      },
    },
    {
      id: "effect.jaquemin.follow-up-attack",
      payload: {
        kind: "addListener",
        listenerId: "listener.jaquemin.follow-up",
        eventKind: "damageApplied",
        sourceBinding: "lastSummonedEntity",
        conditions: [{ kind: "damageSourceIsListenerOwnerHero" }],
        lifetime: "persistent",
        effects: [
          {
            id: "effect.jaquemin.follow-up-attack.damage",
            payload: {
              kind: "dealDamage",
              target: "triggeringTarget",
              minimum: JAQUEMIN_FOLLOW_UP_MIN,
              maximum: JAQUEMIN_FOLLOW_UP_MAX,
              damageType: "physical",
              attackDamageScaling: 0.25,
              abilityPowerScaling: 0,
              armorScaling: 0,
              canBeDodged: true,
            },
            displayText: {
              template:
                "Jaquemin follows your attack with its own {minimum}-{maximum} attack.",
              params: {
                minimum: JAQUEMIN_FOLLOW_UP_MIN,
                maximum: JAQUEMIN_FOLLOW_UP_MAX,
              },
            },
          },
        ],
      },
      displayText: {
        template: "Register Jaquemin's follow-up attack.",
      },
    },
  ],
} satisfies StrongCardDefinition;
