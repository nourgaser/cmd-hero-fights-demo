import type { StrongCardDefinition } from "./types";

import { BASTION_STANCE_CARD } from "./bastion-stance";
import { BATTLE_FOCUS_CARD } from "./battle-focus";
import { CHAAARGE_CARD } from "./chaaarge";
import { CORRODED_SHORTSWORD_CARD } from "./corroded-shortsword";
import { GUARD_SIGIL_CARD } from "./guard-sigil";
import { HEALTH_POTION_CARD } from "./health-potion";
import { HUNKER_DOWN_CARD } from "./hunker-down";
import { IRON_SKIN_CARD } from "./iron-skin";
import { JAQUEMIN_PATROL_CARD } from "./jaquemin-patrol";
import { RESET_LUCK_CARD } from "./reset-luck";
import { REROLL_CARD } from "./reroll";
import { SHATTER_PLATING_CARD } from "./shatter-plating";
import { SHIELD_TOSS_CARD } from "./shield-toss";
import { WAR_STANDARD_CARD } from "./war-standard";
import { WARCRY_CARD } from "./warcry";

export {
  BASTION_STANCE_CARD,
  BATTLE_FOCUS_CARD,
  CHAAARGE_CARD,
  CORRODED_SHORTSWORD_CARD,
  GUARD_SIGIL_CARD,
  HEALTH_POTION_CARD,
  HUNKER_DOWN_CARD,
  IRON_SKIN_CARD,
  JAQUEMIN_PATROL_CARD,
  RESET_LUCK_CARD,
  REROLL_CARD,
  SHATTER_PLATING_CARD,
  SHIELD_TOSS_CARD,
  WAR_STANDARD_CARD,
  WARCRY_CARD,
};

export const COMMANDER_X_CARDS = [
  REROLL_CARD,
  HUNKER_DOWN_CARD,
  RESET_LUCK_CARD,
  IRON_SKIN_CARD,
  HEALTH_POTION_CARD,
  BASTION_STANCE_CARD,
  BATTLE_FOCUS_CARD,
  SHATTER_PLATING_CARD,
  SHIELD_TOSS_CARD,
  CHAAARGE_CARD,
  CORRODED_SHORTSWORD_CARD,
  WAR_STANDARD_CARD,
  GUARD_SIGIL_CARD,
  JAQUEMIN_PATROL_CARD,
  WARCRY_CARD,
] as const satisfies readonly StrongCardDefinition[];

export type CommanderXCardDefinition = (typeof COMMANDER_X_CARDS)[number];
export type CommanderXCardId = CommanderXCardDefinition["id"];
