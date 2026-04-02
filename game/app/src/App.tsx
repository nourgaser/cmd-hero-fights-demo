import './App.css'
import { useState } from 'react'
import {
  createInitialBattleSession,
  type AppBattleSession,
  type AppBattlePreview,
  resolveSessionBasicAttack,
  resolveSessionPlayCard,
  resolveSessionSimpleAction,
} from './game-client.ts'
import { DEFAULT_GAME_BOOTSTRAP_CONFIG } from './data/game-bootstrap.ts'
import { PlayerScreen } from './components/PlayerScreen.tsx'
import { DebugStatePanel } from './components/DebugStatePanel.tsx'

type AppRuntime = {
  session: AppBattleSession
  preview: AppBattlePreview
  lastMessage: string | null
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
          lastMessage: null,
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

  const createUnwiredActionHandler = (heroId: string, actionType: string) => {
    return () => {
      setRuntime((prev) => {
        if (!prev) {
          return prev
        }

        return {
          ...prev,
          lastMessage: `${actionType} for ${heroId} is not wired yet.`,
        }
      })
    }
  }

  const createBasicAttackHandler = (heroId: string) => {
    return (input: { targetEntityId: string }) => {
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

        return {
          session: result.session,
          preview: result.preview,
          lastMessage: result.ok
            ? `Basic attack resolved by ${heroId}.`
            : `Basic attack failed: ${result.reason}`,
        }
      })
    }
  }

  const createPlayCardHandler = (heroId: string) => {
    return (input: { handCardId: string; targetEntityId?: string }) => {
      setRuntime((prev) => {
        if (!prev) {
          return prev
        }

        const result = resolveSessionPlayCard({
          session: prev.session,
          actorHeroEntityId: heroId,
          handCardId: input.handCardId,
          targetEntityId: input.targetEntityId,
        })

        return {
          session: result.session,
          preview: result.preview,
          lastMessage: result.ok
            ? `Played card from hand by ${heroId}.`
            : `Play card failed: ${result.reason}`,
        }
      })
    }
  }

  const createSimpleActionHandler = (heroId: string, kind: 'pressLuck' | 'endTurn') => {
    return () => {
      setRuntime((prev) => {
        if (!prev) {
          return prev
        }

        const result = resolveSessionSimpleAction({
          session: prev.session,
          actorHeroEntityId: heroId,
          kind,
        })

        return {
          session: result.session,
          preview: result.preview,
          lastMessage: result.ok ? `${kind} resolved.` : `${kind} failed: ${result.reason}`,
        }
      })
    }
  }

  return (
    <>
      <DebugStatePanel state={runtime.session.state as Record<string, unknown>} />

      <main className="dual-screens">
        {runtime.lastMessage ? <p className="action-feedback">{runtime.lastMessage}</p> : null}
        <PlayerScreen
          title="CMD Hero Fights"
          selfId={heroAId}
          enemyId={heroBId}
          selfSideKey="a"
          preview={preview}
          onBasicAttack={createBasicAttackHandler(heroAId)}
          onUseEntityActive={createUnwiredActionHandler(heroAId, 'useEntityActive')}
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
          onUseEntityActive={createUnwiredActionHandler(heroBId, 'useEntityActive')}
          onPressLuck={createSimpleActionHandler(heroBId, 'pressLuck')}
          onEndTurn={createSimpleActionHandler(heroBId, 'endTurn')}
          onPlayCard={createPlayCardHandler(heroBId)}
        />
      </main>
    </>
  )
}

export default App
