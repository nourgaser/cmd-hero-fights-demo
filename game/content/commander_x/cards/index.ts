import type { StrongCardDefinition } from "./types";

import { BANNER_OF_X_CARD } from "./banner-of-x";
import { BASTION_STANCE_CARD } from "./bastion-stance";
import { BATTLE_FOCUS_CARD } from "./battle-focus";
import { BULWARK_OF_FORTUNE_CARD } from "./bulwark-of-fortune";
import { CHAAARGE_CARD } from "./chaaarge";
import { COMMON_EXPENDABLE_DEADLY_MAN_CARD } from "./common-expendable-deadly-man";
import { CORRODED_SHORTSWORD_CARD } from "./corroded-shortsword";
import { DEFILED_GREATSWORD_CARD } from "./defiled-greatsword";
import { EVERGROWTH_IDOL_CARD } from "./evergrowth-idol";
import { GLINTING_ADAMANTITE_BLADE_CARD } from "./glinting-adamantite-blade";
import { GUARD_SIGIL_CARD } from "./guard-sigil";
import { HEALING_FORTRESS_CARD } from "./healing-fortress";
import { HEALTH_POTION_CARD } from "./health-potion";
import { HUNKER_DOWN_CARD } from "./hunker-down";
import { IRON_SKIN_CARD } from "./iron-skin";
import { MEDAL_OF_HONOR_CARD } from "./medal-of-honor";
import { MEREWEN_THE_SHIELDMAIDEN_CARD } from "./merewen-the-shieldmaiden";
import { JAQUEMIN_PATROL_CARD } from "./jaquemin-patrol";
import { RIQUIER_THE_BEAR_CARD } from "./riquier-the-bear";
import { RESET_LUCK_CARD } from "./reset-luck";
import { REROLL_CARD } from "./reroll";
import { REACTIVE_BULWARK_CARD } from "./reactive-bulwark";
import { SHATTER_PLATING_CARD } from "./shatter-plating";
import { SHIELD_TOSS_CARD } from "./shield-toss";
import { SHAMANIC_TITANIUM_PUMMELER_CARD } from "./shamanic-titanium-pummeler";
import { STEELBOUND_EFFIGY_CARD } from "./steelbound-effigy";
import { VETERAN_EDGE_CARD } from "./veteran-edge";
import { WAR_STANDARD_CARD } from "./war-standard";
import { WARCRY_CARD } from "./warcry";

export {
  BANNER_OF_X_CARD,
  BASTION_STANCE_CARD,
  BATTLE_FOCUS_CARD,
  BULWARK_OF_FORTUNE_CARD,
  CHAAARGE_CARD,
  COMMON_EXPENDABLE_DEADLY_MAN_CARD,
  CORRODED_SHORTSWORD_CARD,
  DEFILED_GREATSWORD_CARD,
  EVERGROWTH_IDOL_CARD,
  GLINTING_ADAMANTITE_BLADE_CARD,
  GUARD_SIGIL_CARD,
  HEALING_FORTRESS_CARD,
  HEALTH_POTION_CARD,
  HUNKER_DOWN_CARD,
  IRON_SKIN_CARD,
  MEDAL_OF_HONOR_CARD,
  MEREWEN_THE_SHIELDMAIDEN_CARD,
  JAQUEMIN_PATROL_CARD,
  RIQUIER_THE_BEAR_CARD,
  RESET_LUCK_CARD,
  REROLL_CARD,
  REACTIVE_BULWARK_CARD,
  SHATTER_PLATING_CARD,
  SHIELD_TOSS_CARD,
  SHAMANIC_TITANIUM_PUMMELER_CARD,
  STEELBOUND_EFFIGY_CARD,
  VETERAN_EDGE_CARD,
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
  MEDAL_OF_HONOR_CARD,
  REACTIVE_BULWARK_CARD,
  SHATTER_PLATING_CARD,
  SHIELD_TOSS_CARD,
  VETERAN_EDGE_CARD,
  CHAAARGE_CARD,
  CORRODED_SHORTSWORD_CARD,
  DEFILED_GREATSWORD_CARD,
  GLINTING_ADAMANTITE_BLADE_CARD,
  SHAMANIC_TITANIUM_PUMMELER_CARD,
  WAR_STANDARD_CARD,
  GUARD_SIGIL_CARD,
  HEALING_FORTRESS_CARD,
  EVERGROWTH_IDOL_CARD,
  BANNER_OF_X_CARD,
  STEELBOUND_EFFIGY_CARD,
  BULWARK_OF_FORTUNE_CARD,
  JAQUEMIN_PATROL_CARD,
  COMMON_EXPENDABLE_DEADLY_MAN_CARD,
  MEREWEN_THE_SHIELDMAIDEN_CARD,
  RIQUIER_THE_BEAR_CARD,
  WARCRY_CARD,
] as const satisfies readonly StrongCardDefinition[];

export type CommanderXCardDefinition = (typeof COMMANDER_X_CARDS)[number];
export type CommanderXCardId = CommanderXCardDefinition["id"];
