import { useState } from 'react'
import './App.css'
import { createInitialBattlePreview } from './game-client.ts'
import { DEFAULT_GAME_BOOTSTRAP_CONFIG } from './data/game-bootstrap.ts'
import { PlayerScreen } from './components/PlayerScreen.tsx'

function App() {
  const [seedInput, setSeedInput] = useState(DEFAULT_GAME_BOOTSTRAP_CONFIG.seed)
  const [activeConfig, setActiveConfig] = useState(DEFAULT_GAME_BOOTSTRAP_CONFIG)

  let preview: ReturnType<typeof createInitialBattlePreview> | null = null
  let previewError: string | null = null

  try {
    preview = createInitialBattlePreview(activeConfig)
  } catch (error) {
    previewError = error instanceof Error ? error.message : 'Failed to create battle preview.'
  }

  if (!preview) {
    return (
      <main className="dual-screens">
        <section className="screen">
          <h1>CMD Hero Fights</h1>
          <p>Something went wrong.</p>
          <pre className="preview">{previewError}</pre>
        </section>
      </main>
    )
  }

  const [heroAId, heroBId] = preview.heroEntityIds
  const heroASetup = activeConfig.heroes.find((hero) => hero.heroEntityId === heroAId)
  const heroBSetup = activeConfig.heroes.find((hero) => hero.heroEntityId === heroBId)

  const start = () => {
    const trimmed = seedInput.trim()
    const nextSeed = trimmed.length > 0 ? trimmed : DEFAULT_GAME_BOOTSTRAP_CONFIG.seed
    setActiveConfig({
      ...activeConfig,
      seed: nextSeed,
    })
  }

  const reset = () => {
    setSeedInput(DEFAULT_GAME_BOOTSTRAP_CONFIG.seed)
    setActiveConfig(DEFAULT_GAME_BOOTSTRAP_CONFIG)
  }

  return (
    <main className="dual-screens">
      <PlayerScreen
        title="CMD Hero Fights"
        selfId={heroAId}
        enemyId={heroBId}
        selfSideKey="a"
        preview={preview}
        deckCardIds={heroASetup?.openingDeckCardIds ?? []}
        seedInput={seedInput}
        onSeedInputChange={setSeedInput}
        onStart={start}
        onReset={reset}
      />
      <PlayerScreen
        title="CMD Hero Fights"
        selfId={heroBId}
        enemyId={heroAId}
        selfSideKey="b"
        preview={preview}
        deckCardIds={heroBSetup?.openingDeckCardIds ?? []}
        seedInput={seedInput}
        onSeedInputChange={setSeedInput}
        onStart={start}
        onReset={reset}
      />
    </main>
  )
}

export default App
