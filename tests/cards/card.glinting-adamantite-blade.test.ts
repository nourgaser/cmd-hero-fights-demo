import { describe, expect, it } from 'vitest'

import { buildPreviewFromState } from '../../game/app/src/game-client'
import { annotateBattleStateWithActionOptions } from '../../game/engine/actions/annotate-action-options'
import type { SummonedEntityState } from '../../game/shared/models'
import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
  type Sim,
} from '../simulation-test-utils'

function getSummonedEntity(sim: Sim, entityId: string): SummonedEntityState {
  const entity = TEST_QUERIES.getEntity(sim, entityId)
  if (entity.kind === 'hero') {
    throw new Error(`Expected summoned entity for ${entityId}`)
  }
  return entity
}

function withEntityPatch(sim: Sim, entityId: string, patch: Partial<SummonedEntityState>): Sim {
  const entity = getSummonedEntity(sim, entityId)
  const patchedState = {
    ...sim.session.state,
    entitiesById: {
      ...sim.session.state.entitiesById,
      [entityId]: { ...entity, ...patch },
    },
  }
  const nextState = annotateBattleStateWithActionOptions({
    state: patchedState,
    registry: sim.session.gameApi.GAME_CONTENT_REGISTRY,
  })
  const nextSession = { ...sim.session, state: nextState }

  return {
    ...sim,
    session: nextSession,
    preview: buildPreviewFromState({ gameApi: nextSession.gameApi, state: nextState }),
    lastEvents: [],
  }
}

describe('card.glinting-adamantite-blade', () => {
  it('summons Glinting Adamantite Blade and its max damage tracks current HP', () => {
    let sim = TEST_SIM.createSim({
      seed: 'glinting-1',
      deck: [CARD_IDS.glintingAdamantiteBlade],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 20,
    })

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.glintingAdamantiteBlade, {
      targetPosition: { row: 2, column: 4 },
    })

    const summon = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.glintingAdamantiteBlade)
    const before = TEST_QUERIES.getEntityPreview(sim, summon.entityId).activeAbility

    expect(summon.kind).toBe('weapon')
    expect(before?.summaryText).toBe('Deal 2-22 physical.')

    sim = withEntityPatch(sim, summon.entityId, { currentHealth: 15 })

    const after = TEST_QUERIES.getEntityPreview(sim, summon.entityId).activeAbility
    expect(after?.summaryText).toBe('Deal 2-17 physical.')
  })
})
