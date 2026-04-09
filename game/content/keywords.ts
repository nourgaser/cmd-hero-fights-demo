import type {
  KeywordDefinition,
  KeywordReference,
} from "../shared/models";

export const KEYWORD_IDS = {
  battlecry: "keyword.battlecry",
  aura: "keyword.aura",
  chivalry: "keyword.chivalry",
  light: "keyword.light",
  sharpness: "keyword.sharpness",
} as const;

export const BATTLECRY_KEYWORD: KeywordReference = {
  keywordId: KEYWORD_IDS.battlecry,
};

export const KEYWORD_DEFINITIONS = [
  {
    id: KEYWORD_IDS.battlecry,
    name: "Battlecry",
    summaryText: {
      template: "Effect when played.",
    },
  },
  {
    id: KEYWORD_IDS.aura,
    name: "Aura",
    summaryText: {
      template: "A global passive effect that lasts for 5 turns and can stack with copies of itself.",
    },
  },
  {
    id: KEYWORD_IDS.chivalry,
    name: "Chivalry",
    summaryText: {
      template: "Adjacency buffs from allied chivalry units are doubled.",
    },
  },
  {
    id: KEYWORD_IDS.light,
    name: "Light",
    summaryText: {
      template: "Weapon that can attack twice.",
    },
  },
  {
    id: KEYWORD_IDS.sharpness,
    name: "Sharpness",
    summaryText: {
      template: "On attack, destroys {amount} matching base/persistent resistance (not adjacency/passive bonuses).",
    },
  },
] as const satisfies readonly KeywordDefinition[];

export const KEYWORD_DEFINITIONS_BY_ID = Object.fromEntries(
  KEYWORD_DEFINITIONS.map((definition) => [definition.id, definition] as const),
) as Readonly<Record<string, KeywordDefinition>>;