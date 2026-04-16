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
  it('rebuilds legacy v4 replay payloads', () => {
    const encoded =
      '7V3Nbts4EH4Xnq3AdpJ2V7cgXaABukCx21vRAyMxthqJdEkqbhv43TuUW8OxZZuWRwop8yaTEvkNOfPNj6jkmTwxqTLBSXw1IPdCaKUlnd0K_pBNSPxM7qnWObtLSUxSVoho-TsaDkdkQBRjpqPMInMFjdfQuLzjIWN5-p-YKxK_edF2K_Ky4NB8PSBixnjGJ-8pT__PfrIKw5RJwaD783N1-Q_Xmf5RzW9-RhRmMBfvYDSeaUC-6rtIRFHAUExG3-Gu34P_K57YR5FxDWNeAmRNpb7hyVTIj0JVAxgxpZiTeDggSYWOxKPFaoB3LHm8pTK9Sw0qksDl-kwXyZRSKicMpqz6JowzSfMLCZDy_E_riyeElCKFBVOAQqu5kOkJt32l30pWZDyaUQ0z1t0ypzICwXkKHU36JyW0RCqbZLXDH-ieMprraTQT1WI3uSGTgkfqMavtvKfKPFcJkKx24eUdlc4-iKRUdf1qahQz0kIp8mUxqFe8-xYVD0whKN7ZKx6oHqGJGfKDAO4FAlz-MmoCEIy2wZRZcqM1TR5hPOgW8v0OkoSp4S4m6_oUy9lqaNDLCdPb6r4AOKpMEgbgYi1LZixjCxHj6adSmvXZg8ZqJEvZjB3uks30WcgGgLBkg2VClM3LfZvl9IehqUObNgWtX9LZqjU2bfFVvWT7WHK4CDuIuIMS-j-Uh-wuWHF3OhCrsigEj1nVcaGFZsW6u4tHltJb7a2lnjjEGeONdexaFWwEqFKVLQHoUoBLS9IbrYeG3lG7BhyjIShrk93qkErQzM0hDdt0q2fNF5vmhrgYlvuJqBmIW3SyllUWftmuhTvlUB1S6mrtrxquPc7s463Zz4lid8i-z4lfWTrxk7Glks7bC5O6VPE3nsYP68Ut-3j91BVrd9-7sqyKXN5aG9j4-Ci5VGyJ6AZ6nkz5bi9SJUqZ_H5i98ZDcW9GOUy0WRy1pUnb5L_X5QgUE7BVnbWqEiY3H3adf1lDhLcHr1f4wnFEnUcJOAz0dxMXP_YzTx9v5-kWCmlLt6_tjJvoUKhltpd6NQqO_PbZKJQ0Hnmaa7_Y8LF_QUW1-DvTXYywwiWKtN2gIyyywlZrkZsKM2d0BuZYcwyhaRyxz8a9LgWiUErT8h1mIdJRasejMpyAtCn74xFpsPiW7HSv97F1O3CA8li308qGnmx5iCW1PofxOA7gukmaa5v5YXoJ98perfit0-nwKIJ1PYFAAO9oeOFpGrT9RsbCH9mWLjH9rqO-zdHkavOtUevZ4-tlvKeHh32OKjxxaggxPkr41Og9pfXLJj_DJ_St6lonLcnw8MEiZDLs5DBU9_VZ9-j0DOKQY6yhVyELgqSvF7t4Dd7HYBEh_-zDi1v_fDh-scR9Z44AHicqtj87sxYVI55v6vfHb30ujwdEPXUo7pGnt4g8LQt4HiiET7N7TqteJxlOhR-IJaTgyILb8BRR8ATOUVdA5GASEngpIHINUZ9fbrmHKPi3wN0uskBA5COiPnN3YMpzR9TnmknwJueOKNRMfOWlgMjXuPvkIx-2x2W9ZaWAyEdEbvoSnK-wtv_yY-_IMiDyEVFIT3yQ7suA6KxgecbZHfw_ku_wRff47eIX'

    const payload = decodeReplayUrlPayload(encoded)
    expect(payload).not.toBeNull()
    expect(payload?.version).toBe(5)

    const runtime = createRuntimeFromReplayPayload(payload!)
    expect(runtime.session.actionLog.length).toBe(payload!.actionLog.length)
    expect(runtime.session.activeSnapshotId).toBe(254)
  })

  it('rebuilds the provided v5 live replay hash exactly', () => {
    const encoded =
      '5VvNbuM2EH4Xnq3AdrLbVrcgW2ADbIFF21uRAy2ObTYS6VJUnDTIu-9Q9mb1Q9uUJUVU9hRFHJPz-81wSD2TB1Apl4KEHyZkIaVOtaKbGymWfEXCZ7KgWsdwy0hIGCQy2P0fTKczMiEpgBnIeGCegulsii93FEsOMftTblMSfiy9u5Fxlgh8jevJDQguVp-pYH_x_4GEVxOyBiUBh_95zh9_F5rrp3x9829AcQXz8AlnE1wj569jF5FMEpwKVPCIVPvJ_5AP8FVyoXHOS2RZU6WvRbSW6qtM8wmMmEpuSTidkCjnjoSzl9cJPkF0f0MVu2WGKxLh48UKBCgaX6wzcY_LMbkVuGI-VGDiAlC5K5xarwPOZHwmySKLt1TdB3IZLKXSmQAb1RpojNzmJArS1EaTgIItiECvIUjXxhoJ5QysvDehXVCB-jAMGsU3HeZKiiC959apFdBI8wcI9lqw0axQcG1kp4ziS3QYJI8ps-qJoePE6KwrnFmnW6mYjSpdm5l4FOBk-DdLgk2WJBCDslFHa0qpWgG5e5nY3XbRo9tiIDm6bdkoeSAvZZRZfeXUuHlGu8EjLsfoAkkZUBY_BUjRBb3xZwyKjcxltZlIA8QLmQkWwBLR6sm-qlKSoblT1Nxhc_9L_8sg4SLYUK3sUehA8gAaUQFlZOgKlnH03wANieLbuWjkx42IXx20mavfvaBDExOAUnyRmA8QlDFOjeduDMZ8ySITkEgg1WcrWJt42P8Czf53powp3eidVlg0XKFEv6Apj661pqekwMGcCpRtLEVd5SoyEYlxugJtWbaNJmL6ZEL5uGAIMGjSXci_vg3Nu_CqwmVDZkapNEc-jd4O8WnGHPjEZbs0lkYpP4a78qq2dg38sWL6Dv7zlzZ2bR7Qb-gJYYqQJEUI-YCBrw1ClRRHswrqsI0DZSnsxq_zAuSUPVOZqWj_iw44H8LzzvC5q3Y-58BxXvDXOKY7ji_bAVu3KGsC91dnJRaqtoGV6MpxYXs0bcpxt5puafZu1VdNrofUNz9k8AZAk-OlFWhoBWi2QDeIMgerRFeIqQKYlhqSeu3tI9buVWDZAjjjq1X4-n68In0nSDKb1rjsfo25c_DjHtQe_EOmyXmvZhxDAdA86ktO1PsW6x1iW-uEkUfeh3PSbuNCwZuCtlWkVlubFYO84U6vXbiNJMs1BZG2meiAbxxLQWcXUL4AtZNjv3kpmyPTpTMyzVr0Hrrfes3cmyYFTyozPlqIPF2TNk71faJV69T985R0TkjRs1yVs49zRfkx4aHDxXEmTI_B_JdzwLy8wfOhzVt3wMbY1uosarR5wdvS2Q8s6Be6G8vYSR00rzeOHOqgy1LM998Y6AbefnMWtdB9LYvqP7z10kNx8s0j7UcPj__HUQT5UM-9I7Bz72AXTi3LCDAIdM1n50DXzDvoOlG6vD8c80HpVSgq63mQ7sv86pyqo-zPo9ruVS7u-tlu6Sl7FS70nh_jvjSNPE7F7VqCBSMN2i3qTIqyq41o7zpMheF-xHjwaspwya6Pk-x3nsdHiL1vjFEd1AJjaLv3cBnJ_V7jwQvJ3ZSZ9UM-P3KCvSj0oThyTb_tMtaI8NdBY53f95nXD2L8yLOuTcjhONxFVvHbKR8vm7Yvf33cP44iYfaDgGPI7UN94zSGPbEXivrZ1vX4Y8L-LzmeLgLcr9YVduS-3MY4djv6bkI0x2-GuYBb_Kz4kYQii-OXbw'

    const payload = decodeReplayUrlPayload(encoded)
    expect(payload).not.toBeNull()
    expect(payload?.version).toBe(5)
    expect(payload?.timelineIndex).toBeNull()

    const runtime = createRuntimeFromReplayPayload(payload!)
    expect(runtime.session.activeSnapshotId).toBeNull()
    expect(runtime.session.actionLog.length).toBe(124)
    expect(runtime.session.history.length).toBe(124)
    expect(runtime.session.state.turn.turnNumber).toBe(29)
    expect(runtime.session.state.turn.activeHeroEntityId).toBe('hero-a')
    expect(runtime.session.state.entitiesById['hero-a']?.currentHealth).toBe(2)
    expect(runtime.session.state.entitiesById['hero-b']?.currentHealth).toBe(60)

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
