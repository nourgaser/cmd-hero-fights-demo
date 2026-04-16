import { describe, expect, it } from 'vitest'

import { buildPreviewFromState } from '../../game/app/src/game-client'
import { annotateBattleStateWithActionOptions } from '../../game/engine/actions/annotate-action-options'
import type { HeroEntityState, SummonedEntityState } from '../../game/shared/models'
import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
  type Sim,
} from '../simulation-test-utils'

function getHeroEntity(sim: Sim, heroId: string): HeroEntityState {
  const entity = TEST_QUERIES.getEntity(sim, heroId)
  if (entity.kind !== 'hero') {
    throw new Error(`Expected hero entity for ${heroId}`)
  }
  return entity
}

function getSummonedEntity(sim: Sim, entityId: string): SummonedEntityState {
  const entity = TEST_QUERIES.getEntity(sim, entityId)
  if (entity.kind === 'hero') {
    throw new Error(`Expected summoned entity for ${entityId}`)
  }
  return entity
}

function withHeroPatch(sim: Sim, heroId: string, patch: Partial<HeroEntityState>): Sim {
  const entity = getHeroEntity(sim, heroId)
  const patchedState = {
    ...sim.session.state,
    entitiesById: {
      ...sim.session.state.entitiesById,
      [heroId]: { ...entity, ...patch },
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

function withSummonedEntityPatch(
  sim: Sim,
  entityId: string,
  patch: Partial<SummonedEntityState>,
): Sim {
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

describe('card.merewen-the-shieldmaiden', () => {
  it('summons Merewen, buffs adjacent allies, heals them, and reflects the next attack', () => {
    let sim = TEST_SIM.createSim({
      seed: 'mer-hero',
      deck: [CARD_IDS.merewenTheShieldmaiden],
      opponentDeck: [CARD_IDS.shieldToss],
      openingHandSize: 1,
      openingMovePoints: 20,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const beforeAttackDamage = TEST_QUERIES.getEntityPreview(sim, heroId).attackDamage

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.merewenTheShieldmaiden, {
      targetPosition: { row: 1, column: 3 },
    })

    const merewen = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.merewenTheShieldmaiden)
    expect(TEST_QUERIES.getEntityPreview(sim, heroId).attackDamage).toBeGreaterThan(beforeAttackDamage)

    sim = withHeroPatch(sim, heroId, { currentHealth: 50 })
    sim = withSummonedEntityPatch(sim, merewen.entityId, { remainingMoves: 2 })

    sim = TEST_ACTIONS.useEntityActive(sim, merewen.entityId)

    const healEvent = TEST_QUERIES.eventsOfKind(sim.lastEvents, 'healApplied')[0]
    expect(healEvent?.targetEntityId).toBe(heroId)
    expect(healEvent?.amount).toBe(4)

    sim = TEST_ACTIONS.endTurn(sim)
    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.shieldToss, { targetEntityId: merewen.entityId })

    const lastDamageEvents = TEST_QUERIES.eventsOfKind(sim.lastEvents, 'damageApplied')
    expect(lastDamageEvents).toHaveLength(2)
    expect(lastDamageEvents[0]?.targetEntityId).toBe(merewen.entityId)
    expect(lastDamageEvents[1]?.sourceEntityId).toBe(merewen.entityId)
  })
})
