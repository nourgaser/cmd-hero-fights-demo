import './App.css'
import { createInitialBattlePreview } from './game-client.ts'
import { DEFAULT_GAME_BOOTSTRAP_CONFIG } from './data/game-bootstrap.ts'
import { PlayerScreen } from './components/PlayerScreen.tsx'

function App() {
  const activeConfig = DEFAULT_GAME_BOOTSTRAP_CONFIG

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

  return (
    <main className="dual-screens">
      <PlayerScreen
        title="CMD Hero Fights"
        selfId={heroAId}
        enemyId={heroBId}
        selfSideKey="a"
        preview={preview}
      />
      <PlayerScreen
        title="CMD Hero Fights"
        selfId={heroBId}
        enemyId={heroAId}
        selfSideKey="b"
        preview={preview}
      />
    </main>
  )
}

export default App
