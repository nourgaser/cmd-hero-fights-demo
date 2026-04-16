import { describe, expect, it } from 'vitest'

import type { SummonedEntityState } from '../../game/shared/models'
import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.defiled-greatsword', () => {
  it('summons Defiled Greatsword and it can attack once', () => {
    let sim = TEST_SIM.createSim({
      seed: 'defiled-1',
      deck: [CARD_IDS.defiledGreatsword],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 20,
    })

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.defiledGreatsword, {
      targetPosition: { row: 2, column: 4 },
    })

    const summon = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.defiledGreatsword)
    const summonPreview = TEST_QUERIES.getEntityPreview(sim, summon.entityId)
    expect(summon.kind).toBe('weapon')
    expect(summonPreview.currentHealth).toBe(25)
    expect(summonPreview.activeAbility).toBeDefined()

    sim = TEST_ACTIONS.useEntityActive(sim, summon.entityId, TEST_QUERIES.getOpponentHero(sim))

    const damageEvent = TEST_QUERIES.eventsOfKind(sim.lastEvents, 'damageApplied')[0]
    const updatedSummon = TEST_QUERIES.getEntity(sim, summon.entityId) as SummonedEntityState
    expect(damageEvent?.sourceEntityId).toBe(summon.entityId)
    expect(damageEvent?.wasDodged).toBe(false)
    expect(updatedSummon.remainingMoves).toBe(0)
  })
})
