import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.medal-of-honor', () => {
  it('buffs an allied companion and grants temporary immune', () => {
    let sim = TEST_SIM.createSim({
      seed: 'medal-2',
      deck: [CARD_IDS.commonExpendableDeadlyMan, CARD_IDS.medalOfHonor],
      opponentDeck: [CARD_IDS.shieldToss],
      openingHandSize: 2,
      openingMovePoints: 12,
    })

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.commonExpendableDeadlyMan, {
      targetPosition: { row: 2, column: 4 },
    })

    const ally = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.commonExpendableDeadlyMan)

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.medalOfHonor, { targetEntityId: ally.entityId })

    let allyPreview = TEST_QUERIES.getEntityPreview(sim, ally.entityId)
    expect(allyPreview.attackDamage).toBe(2)
    expect(allyPreview.isImmune).toBe(true)

    sim = TEST_ACTIONS.endTurn(sim)
    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.shieldToss, { targetEntityId: ally.entityId })

    expect(TEST_QUERIES.eventsOfKind(sim.lastEvents, 'damageApplied')).toHaveLength(0)
    expect(TEST_QUERIES.getEntity(sim, ally.entityId).currentHealth).toBe(10)

    sim = TEST_ACTIONS.endTurn(sim)

    allyPreview = TEST_QUERIES.getEntityPreview(sim, ally.entityId)
    expect(allyPreview.isImmune).toBe(false)
    expect(TEST_QUERIES.eventsOfKind(sim.lastEvents, 'numberModifierExpired')).toHaveLength(1)
  })
})
