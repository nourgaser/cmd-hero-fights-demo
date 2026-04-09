export type InspectTarget =
  | { kind: 'entity'; entityId: string }
  | { kind: 'handCard'; cardId: string }
