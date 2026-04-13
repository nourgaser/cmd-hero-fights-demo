import type { BattleState, TargetSelector } from '../../shared/models'

/**
 * Deterministically resolves a target selector to an entity ID.
 * 
 * This is the core of chess-grade replay: instead of serializing specific entity IDs
 * (which become stale), we serialize declarative selectors. Resolution is always fresh
 * and deterministic using stable tie-breaking.
 */
export function resolveSelectorToDeterministicEntity(
  battleState: BattleState,
  selector: TargetSelector,
): string | null {
  switch (selector.type) {
    case 'hero': {
      const hero = Object.values(battleState.entitiesById).find(
        (e) => e.kind === 'hero' && e.heroDefinitionId === selector.heroDefinitionId,
      )
      return hero?.entityId ?? null
    }

    case 'summoned': {
      // Find all entities matching the selector criteria
      const candidates = Object.values(battleState.entitiesById).filter((e) => {
        if (e.kind === 'hero') return false
        
        const ownerHero = battleState.entitiesById[e.ownerHeroEntityId]
        if (!ownerHero || ownerHero.kind !== 'hero') return false
        if (ownerHero.heroDefinitionId !== selector.ownerHeroDefinitionId) return false
        if (e.kind !== selector.kind) return false
        if (e.definitionCardId !== selector.definitionCardId) return false
        
        return true
      })

      // First try: exact position match
      const exactMatch = candidates.find((e) => {
        if (e.kind === 'hero') return false
        return (
          e.anchorPosition.row === selector.anchorPosition.row &&
          e.anchorPosition.column === selector.anchorPosition.column
        )
      })
      if (exactMatch) {
        return exactMatch.entityId
      }

      // Fallback: deterministic tie-break by entityId if multiple or single candidate
      if (candidates.length > 0) {
        const sorted = candidates.sort((a, b) => a.entityId.localeCompare(b.entityId))
        return sorted[0]!.entityId
      }

      return null
    }

    case 'self':
      // Caller should resolve this in context; not resolvable here
      return null

    case 'source':
      // Caller should resolve this in context; not resolvable here
      return null

    default:
      return null
  }
}

/**
 * Creates a selector for an entity. Used during serialization.
 */
export function createSelectorForEntity(state: BattleState, entityId: string): TargetSelector | null {
  const entity = state.entitiesById[entityId]
  if (!entity) {
    return null
  }

  if (entity.kind === 'hero') {
    return {
      type: 'hero',
      heroDefinitionId: entity.heroDefinitionId,
    }
  }

  // Summoned entity
  const ownerHero = state.entitiesById[entity.ownerHeroEntityId]
  if (!ownerHero || ownerHero.kind !== 'hero') {
    return null
  }

  return {
    type: 'summoned',
    ownerHeroDefinitionId: ownerHero.heroDefinitionId,
    kind: entity.kind,
    definitionCardId: entity.definitionCardId,
    anchorPosition: { ...entity.anchorPosition },
  }
}
