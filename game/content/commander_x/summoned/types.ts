import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityActiveProfile } from "../../../engine/actions/resolve-use-entity-active";
import type { EntityFootprint } from "../../../shared/models";
import type { CommanderXSummonedEntityId } from "../constants";

export type CommanderXSummonedDefinition = {
  entityId: CommanderXSummonedEntityId;
  blueprint: SummonedEntityBlueprint;
  footprint: EntityFootprint;
  active?: EntityActiveProfile;
};