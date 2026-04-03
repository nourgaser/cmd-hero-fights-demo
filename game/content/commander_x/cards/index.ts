import type { StrongCardDefinition } from "./types";

import { BASTION_STANCE_CARD } from "./bastion-stance";
import { BATTLE_FOCUS_CARD } from "./battle-focus";
import { CHAAARGE_CARD } from "./chaaarge";
import { CORRODED_SHORTSWORD_CARD } from "./corroded-shortsword";
import { GUARD_SIGIL_CARD } from "./guard-sigil";
import { HEALTH_POTION_CARD } from "./health-potion";
import { IRON_SKIN_CARD } from "./iron-skin";
import { JAQUEMIN_PATROL_CARD } from "./jaquemin-patrol";
import { REROLL_CARD } from "./reroll";
import { SHIELD_TOSS_CARD } from "./shield-toss";
import { WAR_STANDARD_CARD } from "./war-standard";

export {
  BASTION_STANCE_CARD,
  BATTLE_FOCUS_CARD,
  CHAAARGE_CARD,
  CORRODED_SHORTSWORD_CARD,
  GUARD_SIGIL_CARD,
  HEALTH_POTION_CARD,
  IRON_SKIN_CARD,
  JAQUEMIN_PATROL_CARD,
  REROLL_CARD,
  SHIELD_TOSS_CARD,
  WAR_STANDARD_CARD,
};

export const COMMANDER_X_CARDS = [
  REROLL_CARD,
  IRON_SKIN_CARD,
  HEALTH_POTION_CARD,
  BASTION_STANCE_CARD,
  BATTLE_FOCUS_CARD,
  SHIELD_TOSS_CARD,
  CHAAARGE_CARD,
  CORRODED_SHORTSWORD_CARD,
  WAR_STANDARD_CARD,
  GUARD_SIGIL_CARD,
  JAQUEMIN_PATROL_CARD,
] as const satisfies readonly StrongCardDefinition[];

export type CommanderXCardDefinition = (typeof COMMANDER_X_CARDS)[number];
export type CommanderXCardId = CommanderXCardDefinition["id"];
