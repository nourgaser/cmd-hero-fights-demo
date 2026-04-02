import './App.css'
import { useEffect, useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import {
  createInitialBattleSession,
  type AppBattleSession,
  type AppBattlePreview,
  resolveSessionBasicAttack,
  resolveSessionPlayCard,
  resolveSessionSimpleAction,
  resolveSessionUseEntityActive,
} from './game-client.ts'
import { DEFAULT_GAME_BOOTSTRAP_CONFIG } from './data/game-bootstrap.ts'
import { PlayerScreen } from './components/PlayerScreen.tsx'
import { DebugStatePanel } from './components/DebugStatePanel.tsx'

const DEBUG_SEED_STORAGE_KEY = 'cmd-hero:debug-seed'

type AppRuntime = {
  session: AppBattleSession
  preview: AppBattlePreview
}

function createRuntimeFromConfig(config = DEFAULT_GAME_BOOTSTRAP_CONFIG): AppRuntime {
  const initial = createInitialBattleSession(config)
  return {
    session: initial.session,
    preview: initial.preview,
  }
}

function incrementSeed(seed: string): string {
  const match = seed.match(/^(.*?)(\d+)$/)
  if (!match) {
    return `${seed}-1`
  }

  const [, prefix, digits] = match
  const nextValue = Number.parseInt(digits, 10) + 1
  const nextDigits = `${nextValue}`.padStart(digits.length, '0')
  return `${prefix}${nextDigits}`
}

function loadBootstrapConfig() {
  if (typeof window === 'undefined') {
    return DEFAULT_GAME_BOOTSTRAP_CONFIG
  }

  const persistedSeed = window.localStorage.getItem(DEBUG_SEED_STORAGE_KEY)?.trim()
  const baseSeed = persistedSeed || DEFAULT_GAME_BOOTSTRAP_CONFIG.seed
  const nextSeed = incrementSeed(baseSeed)
  window.localStorage.setItem(DEBUG_SEED_STORAGE_KEY, nextSeed)

  return {
    ...DEFAULT_GAME_BOOTSTRAP_CONFIG,
    seed: nextSeed,
  }
}

function updateHoverCardPlacement(wrap: HTMLElement) {
  const hoverCard = wrap.querySelector<HTMLElement>('.hover-card')
  if (!hoverCard) {
    return
  }

  const rect = wrap.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const maxTooltipWidth = Math.max(180, Math.min(340, viewportWidth - 24))
  const tooltipWidth = Math.min(Math.max(hoverCard.scrollWidth, hoverCard.offsetWidth, 180), maxTooltipWidth)
  const tooltipHeight = Math.min(Math.max(hoverCard.scrollHeight, hoverCard.offsetHeight, 84), viewportHeight - 24)

  const spaceAbove = rect.top
  const spaceBelow = viewportHeight - rect.bottom
  const placeBottom = spaceAbove < tooltipHeight + 24 && spaceBelow > spaceAbove

  let align: 'left' | 'center' | 'right' = 'center'
  const spaceLeft = rect.left
  const spaceRight = viewportWidth - rect.right

  if (spaceLeft < tooltipWidth * 0.5 + 20 && spaceRight > spaceLeft) {
    align = 'left'
  } else if (spaceRight < tooltipWidth * 0.5 + 20 && spaceLeft > spaceRight) {
    align = 'right'
  } else if (rect.left + rect.width * 0.5 < viewportWidth * 0.35) {
    align = 'left'
  } else if (rect.right - rect.width * 0.5 > viewportWidth * 0.65) {
    align = 'right'
  }

  wrap.dataset.hoverPlacement = placeBottom ? 'bottom' : 'top'
  wrap.dataset.hoverAlign = align
  wrap.style.setProperty('--hover-tooltip-max-width', `${maxTooltipWidth}px`)
}

function App() {
  const [initialBootstrapConfig] = useState(() => loadBootstrapConfig())
  const [bootstrapConfig, setBootstrapConfig] = useState(initialBootstrapConfig)
  const [startupError] = useState(() => {
    try {
      createRuntimeFromConfig(initialBootstrapConfig)
      return null as string | null
    } catch (error) {
      return error instanceof Error ? error.message : 'Failed to create battle preview.'
    }
  })
  const [runtime, setRuntime] = useState<AppRuntime | null>(() => {
    try {
      return createRuntimeFromConfig(initialBootstrapConfig)
    } catch {
      return null
    }
  })
  const [resetEpoch, setResetEpoch] = useState(0)

  useEffect(() => {
    const updateActiveHoverCards = () => {
      document.querySelectorAll<HTMLElement>('.hint-wrap').forEach((wrap) => {
        if (wrap.matches(':hover, :focus-within')) {
          updateHoverCardPlacement(wrap)
        }
      })
    }

    const handlePointerOver = (event: PointerEvent) => {
      const wrap = (event.target as HTMLElement | null)?.closest('.hint-wrap') as HTMLElement | null
      if (wrap) {
        updateHoverCardPlacement(wrap)
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      const wrap = (event.target as HTMLElement | null)?.closest('.hint-wrap') as HTMLElement | null
      if (wrap) {
        updateHoverCardPlacement(wrap)
      }
    }

    window.addEventListener('pointerover', handlePointerOver, true)
    window.addEventListener('focusin', handleFocusIn)
    window.addEventListener('resize', updateActiveHoverCards)
    window.addEventListener('scroll', updateActiveHoverCards, true)

    updateActiveHoverCards()

    return () => {
      window.removeEventListener('pointerover', handlePointerOver, true)
      window.removeEventListener('focusin', handleFocusIn)
      window.removeEventListener('resize', updateActiveHoverCards)
      window.removeEventListener('scroll', updateActiveHoverCards, true)
    }
  }, [])

  const resetRuntime = (nextConfig = bootstrapConfig) => {
    try {
      const nextRuntime = createRuntimeFromConfig(nextConfig)
      setRuntime(nextRuntime)
      setResetEpoch((current) => current + 1)
      return null
    } catch (error) {
      return error instanceof Error ? error.message : 'Failed to reset battle preview.'
    }
  }

  const handleSeedChange = (seed: string) => {
    const nextConfig = {
      ...bootstrapConfig,
      seed: seed.trim() || DEFAULT_GAME_BOOTSTRAP_CONFIG.seed,
    }
    setBootstrapConfig(nextConfig)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DEBUG_SEED_STORAGE_KEY, nextConfig.seed)
    }

    const failureReason = resetRuntime(nextConfig)
    if (failureReason) {
      toast.error(failureReason)
    }
  }

  const handleHardReset = () => {
    const failureReason = resetRuntime(bootstrapConfig)
    if (failureReason) {
      toast.error(failureReason)
    }
  }

  if (!runtime) {
    return (
      <main className="dual-screens">
        <section className="screen">
          <h1>CMD Hero Fights</h1>
          <p>Something went wrong.</p>
          <pre className="preview">{startupError ?? 'Failed to create battle preview.'}</pre>
        </section>
      </main>
    )
  }

  const preview = runtime.preview

  const [heroAId, heroBId] = preview.heroEntityIds

  const createBasicAttackHandler = (heroId: string) => {
    return (input: { targetEntityId: string }) => {
      let failureReason: string | null = null

      setRuntime((prev) => {
        if (!prev) {
          return prev
        }

        const result = resolveSessionBasicAttack({
          session: prev.session,
          actorHeroEntityId: heroId,
          attackerEntityId: heroId,
          targetEntityId: input.targetEntityId,
        })

        if (!result.ok) {
          failureReason = result.reason
        }

        return {
          session: result.session,
          preview: result.preview,
        }
      })

      if (failureReason) {
        toast.error(`Basic attack failed: ${failureReason}`)
      }
    }
  }

  const createEntityActiveHandler = (heroId: string) => {
    return (input: { sourceEntityId: string; targetEntityId: string }) => {
      let failureReason: string | null = null

      setRuntime((prev) => {
        if (!prev) {
          return prev
        }

        const result = resolveSessionUseEntityActive({
          session: prev.session,
          actorHeroEntityId: heroId,
          sourceEntityId: input.sourceEntityId,
          targetEntityId: input.targetEntityId,
        })

        if (!result.ok) {
          failureReason = result.reason
        }

        return {
          session: result.session,
          preview: result.preview,
        }
      })

      if (failureReason) {
        toast.error(`Entity active failed: ${failureReason}`)
      }
    }
  }

  const createPlayCardHandler = (heroId: string) => {
    return (input: {
      handCardId: string
      targetEntityId?: string
      targetPosition?: { row: number; column: number }
    }) => {
      let failureReason: string | null = null

      setRuntime((prev) => {
        if (!prev) {
          return prev
        }

        const result = resolveSessionPlayCard({
          session: prev.session,
          actorHeroEntityId: heroId,
          handCardId: input.handCardId,
          targetEntityId: input.targetEntityId,
          targetPosition: input.targetPosition,
        })

        if (!result.ok) {
          failureReason = result.reason
        }

        return {
          session: result.session,
          preview: result.preview,
        }
      })

      if (failureReason) {
        toast.error(`Play card failed: ${failureReason}`)
      }
    }
  }

  const createSimpleActionHandler = (heroId: string, kind: 'pressLuck' | 'endTurn') => {
    return () => {
      let failureReason: string | null = null

      setRuntime((prev) => {
        if (!prev) {
          return prev
        }

        const result = resolveSessionSimpleAction({
          session: prev.session,
          actorHeroEntityId: heroId,
          kind,
        })

        if (!result.ok) {
          failureReason = result.reason
        }

        return {
          session: result.session,
          preview: result.preview,
        }
      })

      if (failureReason) {
        toast.error(`${kind} failed: ${failureReason}`)
      }
    }
  }

  return (
    <>
      <Toaster
        position="top-center"
        gutter={10}
        toastOptions={{
          className: 'game-toast',
          duration: 2800,
        }}
      />
      <DebugStatePanel
        state={runtime.session.state as Record<string, unknown>}
        seed={bootstrapConfig.seed}
        onSeedChange={handleSeedChange}
        onHardReset={handleHardReset}
      />

      <main key={resetEpoch} className="dual-screens">
        <PlayerScreen
          title="CMD Hero Fights"
          selfId={heroAId}
          enemyId={heroBId}
          selfSideKey="a"
          preview={preview}
          onBasicAttack={createBasicAttackHandler(heroAId)}
          onUseEntityActive={createEntityActiveHandler(heroAId)}
          onPressLuck={createSimpleActionHandler(heroAId, 'pressLuck')}
          onEndTurn={createSimpleActionHandler(heroAId, 'endTurn')}
          onPlayCard={createPlayCardHandler(heroAId)}
        />
        <PlayerScreen
          title="CMD Hero Fights"
          selfId={heroBId}
          enemyId={heroAId}
          selfSideKey="b"
          preview={preview}
          onBasicAttack={createBasicAttackHandler(heroBId)}
          onUseEntityActive={createEntityActiveHandler(heroBId)}
          onPressLuck={createSimpleActionHandler(heroBId, 'pressLuck')}
          onEndTurn={createSimpleActionHandler(heroBId, 'endTurn')}
          onPlayCard={createPlayCardHandler(heroBId)}
        />
      </main>
    </>
  )
}

export default App
