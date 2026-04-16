import { describe, expect, it } from 'vitest'
import seedrandom from 'seedrandom'

import {
  createRuntimeFromConfig,
  createRuntimeFromReplayPayload,
  createActionLogFromSession,
  getActionTimelineSnapshots,
  getReplayPayloadTimelineIndex,
} from '../game/app/src/app-shell/runtime-utils'
import {
  branchSessionFromSnapshot,
  jumpSessionToSnapshot,
  resolveSessionBasicAttack,
  resolveSessionPlayCard,
  resolveSessionSimpleAction,
  resolveSessionUseEntityActive,
} from '../game/app/src/game-client-session'
import {
  createReplayUrlPayload,
  decodeReplayUrlPayload,
  encodeReplayUrlPayload,
} from '../game/app/src/utils/replay-url'
import { CARD_IDS, DEFAULT_GAME_BOOTSTRAP_CONFIG, type GameBootstrapConfig } from '../game/app/src/data/game-bootstrap'

type Runtime = ReturnType<typeof createRuntimeFromConfig>

type PlannedAction =
  | {
      kind: 'playCard'
      handCardId: string
      targetEntityId?: string
      targetPosition?: { row: number; column: number }
    }
  | {
      kind: 'basicAttack'
      targetEntityId: string
    }
  | {
      kind: 'useEntityActive'
      sourceEntityId: string
      targetEntityId?: string
    }
  | {
      kind: 'pressLuck' | 'endTurn'
    }

// Every card in CARD_IDS to exercise all effect types, listeners, auras,
// random targeting selectors, and cast conditions under replay.
const FULL_COVERAGE_DECK = Object.values(CARD_IDS)

function createFullCoverageConfig(seed: string): GameBootstrapConfig {
  return {
    ...DEFAULT_GAME_BOOTSTRAP_CONFIG,
    seed,
    heroes: [
      {
        ...DEFAULT_GAME_BOOTSTRAP_CONFIG.heroes[0],
        openingDeckCardIds: [...FULL_COVERAGE_DECK],
      },
      {
        ...DEFAULT_GAME_BOOTSTRAP_CONFIG.heroes[1],
        openingDeckCardIds: [...FULL_COVERAGE_DECK],
      },
    ],
  }
}

function pick<T>(rng: seedrandom.PRNG, items: T[]): T | null {
  if (items.length === 0) {
    return null
  }

  return items[Math.floor(rng() * items.length)] ?? null
}

function planAction(runtime: Runtime, rng: seedrandom.PRNG): PlannedAction {
  const heroEntityId = runtime.preview.activeHeroEntityId
  const heroTargets = runtime.preview.heroActionTargets.find((entry) => entry.heroEntityId === heroEntityId)
  const heroHand = runtime.preview.heroHands.find((entry) => entry.heroEntityId === heroEntityId)
  const heroCount = runtime.preview.heroHandCounts.find((entry) => entry.heroEntityId === heroEntityId)

  if (!heroTargets || !heroCount) {
    return { kind: 'endTurn' }
  }

  const planned: PlannedAction[] = []

  for (const card of heroHand?.cards ?? []) {
    if (!card.isPlayable) {
      continue
    }

    const hasEntityTargets = card.validTargetEntityIds.length > 0
    const hasPlacementTargets = card.validPlacementPositions.length > 0
    const shouldUseEntityTarget = hasEntityTargets && (!hasPlacementTargets || rng() < 0.5)

    planned.push({
      kind: 'playCard',
      handCardId: card.handCardId,
      targetEntityId: shouldUseEntityTarget
        ? pick(rng, card.validTargetEntityIds) ?? undefined
        : undefined,
      targetPosition: !shouldUseEntityTarget && hasPlacementTargets
        ? pick(rng, card.validPlacementPositions) ?? undefined
        : undefined,
    })
  }

  for (const option of heroTargets.entityActive) {
    planned.push({
      kind: 'useEntityActive',
      sourceEntityId: option.sourceEntityId,
      targetEntityId: pick(rng, option.validTargetEntityIds) ?? undefined,
    })
  }

  const basicAttackTargetEntityId = pick(rng, heroTargets.basicAttack.validTargetEntityIds)
  if (basicAttackTargetEntityId) {
    planned.push({
      kind: 'basicAttack',
      targetEntityId: basicAttackTargetEntityId,
    })
  }

  if (!runtime.preview.turn.pressLuckUsedThisTurn && heroCount.movePoints >= heroTargets.pressLuck.moveCost) {
    planned.push({ kind: 'pressLuck' })
  }

  planned.push({ kind: 'endTurn' })

  return pick(rng, planned) ?? { kind: 'endTurn' }
}

function applyPlannedAction(runtime: Runtime, planned: PlannedAction): Runtime {
  const heroEntityId = runtime.preview.activeHeroEntityId

  const result = (() => {
    switch (planned.kind) {
      case 'playCard':
        return resolveSessionPlayCard({
          session: runtime.session,
          actorHeroEntityId: heroEntityId,
          handCardId: planned.handCardId,
          targetEntityId: planned.targetEntityId,
          targetPosition: planned.targetPosition,
        })
      case 'basicAttack':
        return resolveSessionBasicAttack({
          session: runtime.session,
          actorHeroEntityId: heroEntityId,
          attackerEntityId: heroEntityId,
          targetEntityId: planned.targetEntityId,
        })
      case 'useEntityActive':
        return resolveSessionUseEntityActive({
          session: runtime.session,
          actorHeroEntityId: heroEntityId,
          sourceEntityId: planned.sourceEntityId,
          targetEntityId: planned.targetEntityId,
        })
      case 'pressLuck':
      case 'endTurn':
        return resolveSessionSimpleAction({
          session: runtime.session,
          actorHeroEntityId: heroEntityId,
          kind: planned.kind,
        })
    }
  })()

  return {
    session: result.session,
    preview: result.preview,
  }
}

function expectReplayRoundtripMatchesSnapshot(options: {
  runtime: Runtime
  timelineIndex: number
}) {
  const timelineSnapshots = getActionTimelineSnapshots(options.runtime.session)
  const targetSnapshot = timelineSnapshots[options.timelineIndex]
  expect(targetSnapshot).toBeDefined()

  const jumped = jumpSessionToSnapshot({
    session: options.runtime.session,
    snapshotId: targetSnapshot!.id,
  })
  expect(jumped.ok).toBe(true)
  if (!jumped.ok) {
    return
  }

  const payload = createReplayUrlPayload({
    bootstrapConfig: options.runtime.session.config,
    seed: options.runtime.session.state.seed,
    actionLog: createActionLogFromSession(options.runtime.session),
    timelineIndex: options.timelineIndex,
  })
  const decoded = decodeReplayUrlPayload(encodeReplayUrlPayload(payload))
  expect(decoded).not.toBeNull()

  const rebuilt = createRuntimeFromReplayPayload(decoded!)
  expect(rebuilt.session.activeSnapshotId).toBe(jumped.session.activeSnapshotId)
  expect(rebuilt.session.actionLog).toEqual(jumped.session.actionLog)
  expect(rebuilt.session.state).toEqual(jumped.session.state)
}

function expectReplayRoundtripMatchesCurrentView(runtime: Runtime) {
  const timelineSnapshots = getActionTimelineSnapshots(runtime.session)
  const latestSnapshot = timelineSnapshots.at(-1) ?? null
  const timelineIndex = getReplayPayloadTimelineIndex(runtime.session)

  expect(latestSnapshot).not.toBeNull()
  expect(timelineIndex).toBe(timelineSnapshots.length - 1)

  const payload = createReplayUrlPayload({
    bootstrapConfig: runtime.session.config,
    seed: runtime.session.state.seed,
    actionLog: createActionLogFromSession(runtime.session),
    timelineIndex,
  })
  const decoded = decodeReplayUrlPayload(encodeReplayUrlPayload(payload))
  expect(decoded).not.toBeNull()

  const rebuilt = createRuntimeFromReplayPayload(decoded!)
  expect(rebuilt.session.state).toEqual(runtime.session.state)
  expect(rebuilt.session.actionLog).toEqual(runtime.session.actionLog)
  expect(rebuilt.session.activeSnapshotId).toBe(latestSnapshot?.id ?? null)
}

function expectReplayRoundtripMatchesEverySnapshot(runtime: Runtime) {
  const timelineSnapshots = getActionTimelineSnapshots(runtime.session)
  for (let timelineIndex = 0; timelineIndex < timelineSnapshots.length; timelineIndex += 1) {
    expectReplayRoundtripMatchesSnapshot({ runtime, timelineIndex })
  }
}

describe('replay determinism', () => {
  it('rebuilds the provided v5 live replay hash exactly', () => {
    const encoded =
      '7VzNbuM2EH4Xna3Adrw_1S3IFtgAW2DR9lbkQEtjmY1EeikqThr43TuUjES2KZtWZIt0dIoiTsiZ4TffDH-UF-8RREY584JPA2_KucykIItbzmY09oIXb0qkTOAu8gIvgpT75e_-cDjyBl4GoBpy6qsnfzj-gi9LiRmFJPqTLzMv-Lzx7pYnecrwNY7HF8Aoi78TFv1F_wMvmAy8OQgO2PzPS_H4O5NUPhfjq199giOoh2_YG6MSNX9tuwp5mmJXIPwnlFp3_gd_hJ-cMol9XqPKkgh5w8I5Fz95VnSgzBR86QXDgRcW2nnBaPXawTcIH26JiO4ipZUX4mN1pKtwTggRMeCQu234zJkPT9hVRKbouAhIlDz7KNFUPgYGgiRXAjKQfpKHD7qeBP2VU3ySc_CnQIROJpMAyZTnLPJhhvP93FhoSUQotC3_kl85pJT5CyIFTxqKYP8-zhz6RERN2h9Bos_QsZF-niJEU4IIjgUQmS25vpdsTvCZhj5CEn_mqb_I0xQSEN79aqDH6_SEeMUIahmv6-ie8TDPdO2AbBHj2HLu00g_VdM8wdl48PkMuxEyZ9qB0M-hpI-IzVJcJxMn6AU0yCeR8jv6FcUTEmk7TEHAEliB92yuiCYlNAJtlB0jSwXGY_ZAtY2HYGcKK6WCL3mm9Xmc4xs_ozHV-5sw5APlbgWivc33K4SppxzP2Q-O9I4ci5YpPE5JRsMbKUnBJijCxfca9kWIoBQIXVuGwVB0rzCKyI1B7gbESsXKelykub9zoZy7Z8yKvKGeKurq9FRtBnrisMfpiYa9yS8S8qyC8JAz5zhPZbC-vg3Uu2Ci13KHA0ZvHDBeVTXOMygHvCkC7ZAiGc9FuP6LqjIZMhxnARQNClkLZD7O9maqoKwNeii4ORGucIFJjBXpdyfGpmWMXRvGGFal-hg7mhWwZst-lBVbqyBvYy62ECa5hFSTzRFTrtFMM8vODsdtym8Qk22QXdO56DRdjo9Pl6NzpsutNc6JodsHZWtBKXG00bDOqn2pYhNfllUNPR7bsezdxFXga2SMrwp_XZ-Tv7a3k07sVuvLnrPzUAMCagyQolLQAmTbW28AqdtT2VG8r5_dQnqfiJxIRJfF_8fSq43k1k7pOWnC_JMN5jdizQ2ePfvyrTD12tjUykHdpqkniYIlkAWCoP70x-3QbomBjaLFcS62zca2WPlou3p-XpPWV2POwrNcfWF-PD2fxJtrlqs9dDXFVhP27HTrcB9G-uq8zw2O2vixc4MtbNbOImBsnGUqV4IaV8Zny8CnnPndqzdNp3wfG3aauApo_GYMjXHdKbb1Sc56Bd3Iwvsiw_Hka4lpbeVcU3OsSLU2LMNGjdZhmzTYjiKfLyDjlay3c_G7eSx1X7eZmdRNCv9i975nc1zZmU3PTdJ9OnWk7rmEbNrdPUFTL_cafgQNnSoOGl1xdaOUM928sOF-sYXbK2PzM-naD3Gs372wXsG-ILygqqmVZfbY_FpMZb1vx4749qcKre9BjM2vq1eOC4bv-7KpFbb99P6V8AVeEXWE_kprKl8rO0l7h6xw5StV-wu6XsND25XVfy_gjmquLYw0_OfsSlYzOePTW2PjNYB3FmLd1D_mJwHWrjbrM2d3mhlhocNSpebj5dbN6mapZn55qbJU2_x41q4rsufYnducOBtLpc40dCg796n3DKnXobzSq9qr6oqqVpyGn4aJP8CezAcc937gSYp38CmDO_znh09YRE6-rv4H'

    const payload = decodeReplayUrlPayload(encoded)
    expect(payload).not.toBeNull()
    expect(payload?.version).toBe(5)
    expect(payload?.timelineIndex).toBe(148)

    const runtime = createRuntimeFromReplayPayload(payload!)
    expect(runtime.session.activeSnapshotId).toBe(296)
    expect(runtime.session.actionLog.length).toBe(148)
    expect(runtime.session.history.length).toBe(148)
    expect(runtime.session.state.turn.turnNumber).toBe(30)
    expect(runtime.session.state.turn.activeHeroEntityId).toBe('hero-b')
    expect(runtime.session.state.entitiesById['hero-a']?.currentHealth).toBe(0)
    expect(runtime.session.state.entitiesById['hero-b']?.currentHealth).toBe(85)

    const roundtrippedPayload = decodeReplayUrlPayload(encodeReplayUrlPayload(createReplayUrlPayload({
      bootstrapConfig: runtime.session.config,
      seed: runtime.session.state.seed,
      actionLog: createActionLogFromSession(runtime.session),
      timelineIndex: payload!.timelineIndex,
    })))

    expect(roundtrippedPayload).not.toBeNull()
    expect(createRuntimeFromReplayPayload(roundtrippedPayload!).session.state).toEqual(runtime.session.state)
  })

  it('roundtrips paused replay URLs across random matches', () => {
    for (let run = 0; run < 4; run += 1) {
      const rng = seedrandom(`replay-roundtrip-${run}`)
      let runtime = createRuntimeFromConfig({
        ...DEFAULT_GAME_BOOTSTRAP_CONFIG,
        seed: `replay-seed-${run}`,
      })

      for (let step = 0; step < 50; step += 1) {
        runtime = applyPlannedAction(runtime, planAction(runtime, rng))
        const timelineSnapshots = getActionTimelineSnapshots(runtime.session)
        const timelineIndex = Math.floor(rng() * timelineSnapshots.length)
        expectReplayRoundtripMatchesSnapshot({ runtime, timelineIndex })
      }
    }
  })

  it('roundtrips live replay URLs to the latest visible frame across random matches', () => {
    for (let run = 0; run < 4; run += 1) {
      const rng = seedrandom(`replay-live-roundtrip-${run}`)
      let runtime = createRuntimeFromConfig({
        ...DEFAULT_GAME_BOOTSTRAP_CONFIG,
        seed: `replay-live-seed-${run}`,
      })

      for (let step = 0; step < 50; step += 1) {
        runtime = applyPlannedAction(runtime, planAction(runtime, rng))
        expectReplayRoundtripMatchesCurrentView(runtime)
      }
    }
  })

  it('roundtrips branched timelines after truncating from a paused snapshot', () => {
    const rng = seedrandom('replay-branching')
    let runtime = createRuntimeFromConfig({
      ...DEFAULT_GAME_BOOTSTRAP_CONFIG,
      seed: 'replay-branch-seed',
    })

    for (let step = 0; step < 50; step += 1) {
      runtime = applyPlannedAction(runtime, planAction(runtime, rng))
    }

    const timelineSnapshots = getActionTimelineSnapshots(runtime.session)
    const branchTimelineIndex = Math.max(1, Math.floor(timelineSnapshots.length / 2))
    const paused = jumpSessionToSnapshot({
      session: runtime.session,
      snapshotId: timelineSnapshots[branchTimelineIndex]!.id,
    })

    expect(paused.ok).toBe(true)
    if (!paused.ok) {
      return
    }

    const branched = branchSessionFromSnapshot({
      session: paused.session,
      snapshotId: paused.session.activeSnapshotId!,
    })

    expect(branched.ok).toBe(true)
    if (!branched.ok) {
      return
    }

    runtime = {
      session: branched.session,
      preview: branched.preview,
    }

    for (let step = 0; step < 25; step += 1) {
      runtime = applyPlannedAction(runtime, planAction(runtime, rng))
      const branchTimeline = getActionTimelineSnapshots(runtime.session)
      const timelineIndex = Math.floor(rng() * branchTimeline.length)
      expectReplayRoundtripMatchesSnapshot({ runtime, timelineIndex })
    }
  })

  it('roundtrips every snapshot in a generated match', () => {
    const rng = seedrandom('replay-all-snapshots')
    let runtime = createRuntimeFromConfig({
      ...DEFAULT_GAME_BOOTSTRAP_CONFIG,
      seed: 'replay-all-snapshots-seed',
    })

    for (let step = 0; step < 60; step += 1) {
      runtime = applyPlannedAction(runtime, planAction(runtime, rng))
    }

    expectReplayRoundtripMatchesEverySnapshot(runtime)
  })

  it('roundtrips the initial state before any actions are taken', () => {
    const runtime = createRuntimeFromConfig({
      ...DEFAULT_GAME_BOOTSTRAP_CONFIG,
      seed: 'initial-state-seed',
    })
    expectReplayRoundtripMatchesSnapshot({ runtime, timelineIndex: 0 })
  })

  it('roundtrips with the full card pool covering all effect types and selectors', () => {
    for (let run = 0; run < 4; run += 1) {
      const rng = seedrandom(`full-coverage-${run}`)
      let runtime = createRuntimeFromConfig(createFullCoverageConfig(`full-coverage-seed-${run}`))

      for (let step = 0; step < 80; step += 1) {
        runtime = applyPlannedAction(runtime, planAction(runtime, rng))
        const timelineSnapshots = getActionTimelineSnapshots(runtime.session)
        const timelineIndex = Math.floor(rng() * timelineSnapshots.length)
        expectReplayRoundtripMatchesSnapshot({ runtime, timelineIndex })
      }
    }
  })

  it('roundtrips every snapshot with the full card pool', () => {
    const rng = seedrandom('full-coverage-all-snapshots')
    let runtime = createRuntimeFromConfig(createFullCoverageConfig('full-coverage-all-snapshots-seed'))

    for (let step = 0; step < 80; step += 1) {
      runtime = applyPlannedAction(runtime, planAction(runtime, rng))
    }

    expectReplayRoundtripMatchesEverySnapshot(runtime)
  })

  it('roundtrips matches that reach low hero health (castCondition and endgame states)', () => {
    // Run many steps with aggressive seeds to push heroes toward low health,
    // exercising castCondition-gated cards (chaaarge requires health < 15)
    // and verifying replay determinism when entity health reaches 0.
    for (let run = 0; run < 3; run += 1) {
      const rng = seedrandom(`endgame-${run}`)
      let runtime = createRuntimeFromConfig(createFullCoverageConfig(`endgame-seed-${run}`))

      for (let step = 0; step < 150; step += 1) {
        runtime = applyPlannedAction(runtime, planAction(runtime, rng))
      }

      expectReplayRoundtripMatchesCurrentView(runtime)

      // Verify a spread of snapshots rather than every one to stay within timeout.
      const timelineSnapshots = getActionTimelineSnapshots(runtime.session)
      const sampleIndices = [0, Math.floor(timelineSnapshots.length / 4), Math.floor(timelineSnapshots.length / 2), Math.floor(timelineSnapshots.length * 3 / 4), timelineSnapshots.length - 1]
      for (const timelineIndex of sampleIndices) {
        expectReplayRoundtripMatchesSnapshot({ runtime, timelineIndex })
      }
    }
  })

  it('does not mutate the source session when resolving the same action twice', () => {
    let runtime = createRuntimeFromConfig({
      ...DEFAULT_GAME_BOOTSTRAP_CONFIG,
      seed: 'replay-session-purity-seed',
    })

    const openingPressLuck = resolveSessionSimpleAction({
      session: runtime.session,
      actorHeroEntityId: runtime.preview.activeHeroEntityId,
      kind: 'pressLuck',
    })
    expect(openingPressLuck.ok).toBe(true)
    if (!openingPressLuck.ok) {
      return
    }

    runtime = {
      session: openingPressLuck.session,
      preview: openingPressLuck.preview,
    }

    const openingEndTurn = resolveSessionSimpleAction({
      session: runtime.session,
      actorHeroEntityId: runtime.preview.activeHeroEntityId,
      kind: 'endTurn',
    })
    expect(openingEndTurn.ok).toBe(true)
    if (!openingEndTurn.ok) {
      return
    }

    runtime = {
      session: openingEndTurn.session,
      preview: openingEndTurn.preview,
    }

    const heroTargets = runtime.preview.heroActionTargets.find((entry) => entry.heroEntityId === runtime.preview.activeHeroEntityId)
    const targetEntityId = heroTargets?.basicAttack.validTargetEntityIds[0]
    expect(targetEntityId).toBeDefined()
    if (!targetEntityId) {
      return
    }

    const sourceSession = runtime.session
    const sourceRngStepCount = sourceSession.battleRng.stepCount

    const first = resolveSessionBasicAttack({
      session: sourceSession,
      actorHeroEntityId: runtime.preview.activeHeroEntityId,
      attackerEntityId: runtime.preview.activeHeroEntityId,
      targetEntityId,
    })
    const second = resolveSessionBasicAttack({
      session: sourceSession,
      actorHeroEntityId: runtime.preview.activeHeroEntityId,
      attackerEntityId: runtime.preview.activeHeroEntityId,
      targetEntityId,
    })

    expect(sourceSession.battleRng.stepCount).toBe(sourceRngStepCount)
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) {
      return
    }

    expect(first.resultMessage).toBe(second.resultMessage)
    expect(first.session.state).toEqual(second.session.state)
    expect(first.session.history).toEqual(second.session.history)
    expect(first.session.snapshots).toEqual(second.session.snapshots)
    expect(first.session.actionLog).toEqual(second.session.actionLog)
    expect(first.session.nextSequence).toBe(second.session.nextSequence)
    expect(first.session.battleRng.stepCount).toBe(second.session.battleRng.stepCount)
  })
})
