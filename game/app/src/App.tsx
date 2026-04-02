import { Icon } from '@iconify/react/offline'
import './App.css'
import { createInitialBattlePreview } from './game-client.ts'
import { DEFAULT_GAME_BOOTSTRAP_CONFIG } from './data/game-bootstrap.ts'

function App() {
  const preview = createInitialBattlePreview(DEFAULT_GAME_BOOTSTRAP_CONFIG)

  return (
    <main className="app-shell">
      <section className="card">
        <h1>CMD Hero Fights</h1>
        <p>Frontend stack bootstrapped with Vite + React + TypeScript.</p>
      </section>

      <section className="card">
        <h2>Icon Stack Bootstrap</h2>
        <p>Local Iconify collection is loaded from @iconify-json/game-icons.</p>

        <div className="icon-row">
          <div className="icon-cell">
            <Icon icon="game-icons:crossed-swords" className="game-icon" />
            <span>game-icons:crossed-swords</span>
          </div>
          <div className="icon-cell">
            <Icon
              icon="game-icons:checked-shield"
              className="game-icon"
              color="var(--text-h)"
            />
            <span>game-icons:checked-shield</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Public API Bootstrap</h2>
        <p>App battle preview is built from editable static data under src/data.</p>

        <pre className="preview">{JSON.stringify(preview, null, 2)}</pre>
      </section>
    </main>
  )
}

export default App
