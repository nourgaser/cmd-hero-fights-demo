import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_ASSERTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.healing-fortress', () => {
  it('summons Healing Fortress and increases attack-heal while it remains', () => {
    let sim = TEST_SIM.createSim({
      seed: 'fortress-1',
      deck: [CARD_IDS.healingFortress],
      opponentDeck: [CARD_IDS.warcry],
      openingHandSize: 1,
      openingMovePoints: 12,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.healingFortress, {
      targetPosition: { row: 2, column: 4 },
    })

    const summon = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.healingFortress)
    const summonPreview = TEST_QUERIES.getEntityPreview(sim, summon.entityId)
    expect(summon.kind).toBe('totem')
    expect(summonPreview.isTaunt).toBe(true)
    expect(summonPreview.currentHealth).toBe(5)
    expect(summonPreview.armor).toBe(10)
    expect(summonPreview.magicResist).toBe(7)

    sim = TEST_ACTIONS.endTurn(sim)
    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.warcry, {
      targetEntityId: TEST_QUERIES.getActiveHero(sim),
    })
    sim = TEST_ACTIONS.endTurn(sim)

    const beforeHealth = TEST_QUERIES.getEntity(sim, heroId).currentHealth

    sim = TEST_ACTIONS.basicAttack(sim, TEST_QUERIES.getOpponentHero(sim))

    const damageEvent = TEST_ASSERTIONS.eventsOfKind(sim.lastEvents, 'damageApplied')[0]
    const healEvent = TEST_ASSERTIONS.eventsOfKind(sim.lastEvents, 'healApplied')[0]

    expect(damageEvent?.wasDodged).toBe(false)
    expect(healEvent?.targetEntityId).toBe(heroId)
    expect(healEvent?.amount).toBe(2)
    expect(TEST_QUERIES.getEntity(sim, heroId).currentHealth).toBe(beforeHealth + 2)
  })
})
