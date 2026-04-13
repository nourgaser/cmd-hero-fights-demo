# GEMINI.md - CMD Hero Fights Demo

## Project Overview
CMD Hero Fights Demo is a **lean, deterministic, tactical grid-based card battle game prototype** built to validate core mechanics. It is designed to be a minimal playable demo, not a production-ready system.

### Core Technologies
- **Runtime**: [Bun](https://bun.sh/) (Strict "No Node.js" policy)
- **Language**: TypeScript
- **Frontend**: React 19 + Vite (located in `game/app`)
- **Deterministic RNG**: `seedrandom`
- **Utilities**: `immer`, `ts-pattern`, `zod`

### Architecture
- `game/engine/`: UI-agnostic battle engine.
    - `actions/`: Action handlers (e.g., play card, attack, end turn).
    - `core/`: Battle state, RNG, luck, and damage resolution.
    - `battlefield/`: Grid logic, adjacency, and targeting.
- `game/content/`: Manually-authored game content (Heroes, Cards, Effects).
- `game/app/`: React web UI for playtesting.
- `game/shared/`: Shared models and type definitions.
- `content/`: **Read-only** design reference. **NEVER** import or parse from this directory.

---

## Building and Running

### Prerequisites
Ensure [Bun](https://bun.sh/) is installed.

### Installation
```bash
bun install
```

### Development
- **Web UI**: Run the following to start the dev server and open the web UI.
  ```bash
  cd game/app && bun run dev
  ```
- **Engine Demo**: Run the root engine entry point.
  ```bash
  bun run game/index.ts
  ```

### Build & Lint
- **Build Web UI**: `cd game/app && bun run build`
- **Lint**: `cd game/app && bun run lint`

---

## Development Conventions & Constraints

### Absolute Constraints (from AGENTS.md)
1. **No Overengineering**: Only implement what is immediately needed. No "future-proofing."
2. **No Tests**: Do not add unit, integration, or any other test scaffolding.
3. **No Logging/Debugging Systems**: Avoid adding logs or debug tools to the engine.
4. **No Content Compilation**: Content is manually authored in TypeScript. No automated pipelines.
5. **No Reference Imports**: Never import from the root `content/` directory.

### Engineering Standards
- **Deterministic Engine**: All randomness must be seeded through a centralized RNG (`game/engine/core/rng.ts`).
- **Action-Driven API**: The engine only exposes functionality via player actions. No direct state mutation from outside.
- **Surgical Updates**: When adding cards, reuse existing effects or implement new ones only as needed.
- **Luck & Numbers**: Luck is a post-RNG modifier. Numbers are resolved in a specific order (Base -> Temp Modifiers -> Passive Rules -> Finalization).
- **Battlefield**: Positional logic is centralized; cards should declare targets, not implement adjacency logic.

### UI Standards
- **Vite + React 19**: Modern React patterns.
- **Styling**: Vanilla CSS is preferred for flexibility.
- **Icons**: Uses `@iconify-json/game-icons` for procedural UI iconography.

---

## Implementation Workflow
1. **Research**: Identify the mechanic/card from the design reference.
2. **Strategy**: Map it to existing effects or plan a new minimal effect.
3. **Execution**:
    - Add/modify runtime content in `game/content/`.
    - Implement required effects in `game/engine/`.
    - Update the engine API/actions if necessary.
4. **Validation**: Verify behavior using the Web UI.

---

## Operational Guidelines
- **Be Concise**: Keep responses direct and technical.
- **Explain Before Acting**: Provide a one-sentence intent before executing tools.
- **Safety First**: Never commit or stage changes unless explicitly asked.
