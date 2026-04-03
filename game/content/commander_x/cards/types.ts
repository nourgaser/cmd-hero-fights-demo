import type { CardDefinition, EffectDefinition } from "../../../shared/models";

export type StrongCardDefinition = Omit<CardDefinition, "effects"> & {
  effects: EffectDefinition[];
};
