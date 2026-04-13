import type { BattleAction } from "./action";

export type ReplayActionLogEntry = {
  action: BattleAction;
  success: boolean;
};
