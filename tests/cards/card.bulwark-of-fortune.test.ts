import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.bulwark-of-fortune', () => {
  it('summons Bulwark of Fortune and grants health to a random ally when attacked', () => {
    let sim = TEST_SIM.createSim({
      seed: 'bul-1',
      deck: [CARD_IDS.bulwarkOfFortune],
      opponentDeck: [CARD_IDS.shieldToss],
      openingHandSize: 1,
      openingMovePoints: 12,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const beforeHero = TEST_QUERIES.getEntity(sim, heroId)

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.bulwarkOfFortune, {
      targetPosition: { row: 2, column: 4 },
    })

    const summon = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.bulwarkOfFortune)
    expect(summon.kind).toBe('totem')

    sim = TEST_ACTIONS.endTurn(sim)
    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.shieldToss, { targetEntityId: summon.entityId })

    const afterHero = TEST_QUERIES.getEntity(sim, heroId)
    const healEvent = TEST_QUERIES
      .eventsOfKind(sim.lastEvents, 'healApplied')
      .find((event) => event.sourceEntityId === summon.entityId)

    expect(healEvent?.amount).toBe(5)
    expect(healEvent?.targetEntityId).toBe(heroId)
    expect(afterHero.currentHealth).toBe(beforeHero.currentHealth + 5)
    expect(afterHero.maxHealth).toBe(beforeHero.maxHealth + 5)
  })
})
