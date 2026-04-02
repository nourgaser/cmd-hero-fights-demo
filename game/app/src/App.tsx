import './App.css'
import { useState } from 'react'
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

type AppRuntime = {
  session: AppBattleSession
  preview: AppBattlePreview
}

function App() {
  const activeConfig = DEFAULT_GAME_BOOTSTRAP_CONFIG

  const [bootstrap] = useState(() => {
    try {
      const initial = createInitialBattleSession(activeConfig)
      return {
        runtime: {
          session: initial.session,
          preview: initial.preview,
        } as AppRuntime,
        error: null as string | null,
      }
    } catch (error) {
      return {
        runtime: null as AppRuntime | null,
        error: error instanceof Error ? error.message : 'Failed to create battle preview.',
      }
    }
  })

  const [runtime, setRuntime] = useState<AppRuntime | null>(bootstrap.runtime)

  if (!runtime) {
    return (
      <main className="dual-screens">
        <section className="screen">
          <h1>CMD Hero Fights</h1>
          <p>Something went wrong.</p>
          <pre className="preview">{bootstrap.error}</pre>
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
      <DebugStatePanel state={runtime.session.state as Record<string, unknown>} />

      <main className="dual-screens">
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
