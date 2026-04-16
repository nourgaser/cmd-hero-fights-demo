import { describe, expect, it } from 'vitest'

import { createRuntimeFromConfig } from '../game/app/src/app-shell/runtime-utils'
import {
  resolveSessionBasicAttack,
  resolveSessionSimpleAction,
} from '../game/app/src/game-client-session'
import { DEFAULT_GAME_BOOTSTRAP_CONFIG } from '../game/app/src/data/game-bootstrap'
import type { HeroEntityState } from '../game/shared/models'

describe('game over state', () => {
  it('marks game over when a hero dies and rejects further actions', () => {
    const runtime = createRuntimeFromConfig(DEFAULT_GAME_BOOTSTRAP_CONFIG)
    const [heroAId, heroBId] = runtime.preview.heroEntityIds

    const attacker = runtime.session.state.entitiesById[heroAId]
    const defender = runtime.session.state.entitiesById[heroBId]

    expect(attacker?.kind).toBe('hero')
    expect(defender?.kind).toBe('hero')

    if (!attacker || attacker.kind !== 'hero' || !defender || defender.kind !== 'hero') {
      return
    }

    const preparedAttacker: HeroEntityState = {
      ...attacker,
      movePoints: Math.max(attacker.movePoints, attacker.basicAttackMoveCost),
    }

    const preparedDefender: HeroEntityState = {
      ...defender,
      currentHealth: 1,
      armor: 0,
      magicResist: 0,
      dodgeChance: 0,
    }

    const preparedSession = {
      ...runtime.session,
      state: {
        ...runtime.session.state,
        entitiesById: {
          ...runtime.session.state.entitiesById,
          [heroAId]: preparedAttacker,
          [heroBId]: preparedDefender,
        },
      },
    }

    const attackResult = resolveSessionBasicAttack({
      session: preparedSession,
      actorHeroEntityId: heroAId,
      attackerEntityId: heroAId,
      targetEntityId: heroBId,
    })

    expect(attackResult.ok).toBe(true)
    if (!attackResult.ok) {
      return
    }

    const gameOver = attackResult.session.state.gameOver
    expect(gameOver).not.toBeNull()
    expect(gameOver?.winnerHeroEntityId).toBe(heroAId)
    expect(gameOver?.loserHeroEntityId).toBe(heroBId)
    expect(attackResult.preview.gameOver?.winnerHeroEntityId).toBe(heroAId)

    for (const hand of attackResult.preview.heroHands) {
      expect(hand.cards.every((card) => card.isPlayable === false)).toBe(true)
    }

    for (const targets of attackResult.preview.heroActionTargets) {
      expect(targets.basicAttack.validTargetEntityIds).toEqual([])
      expect(targets.entityActive).toEqual([])
    }

    const blockedResult = resolveSessionSimpleAction({
      session: attackResult.session,
      actorHeroEntityId: heroAId,
      kind: 'endTurn',
    })

    expect(blockedResult.ok).toBe(false)
    if (!blockedResult.ok) {
      expect(blockedResult.reason).toContain('already over')
      expect(blockedResult.session.state.gameOver?.winnerHeroEntityId).toBe(heroAId)
    }
  })
})
