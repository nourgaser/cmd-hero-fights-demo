# MVP Scope Checklist (Commander X)

## Scalability / Maintainability

Current progress (2026-04-13): player-facing formatting lives in `game/app/src/utils/game-client-format.ts`, replay/session resolution lives in `game/app/src/game-client-session.ts`, and preview derivation now lives in the modular `game/app/src/game-client-preview/` directory (with `game-client-preview.ts` as a compatibility barrel). `game-client.ts` is now a thin compatibility surface for shared exports/types, and `App.tsx` has started extracting runtime/bootstrap/helper logic into `game/app/src/app-shell/runtime-utils.ts`.

- [x] Break up the largest source files first (game/app/src/App.css, game/app/src/App.tsx, game/app/src/components/SettingsPanel.tsx, game/app/src/components/DebugStatePanel.tsx, game/engine/actions/effects/handlers/combat.ts, game/engine/actions/effects/handlers/stats.ts) so no single file keeps absorbing unrelated responsibilities.
- [x] Split game/app/src/game-client.ts into smaller modules for preview derivation, replay/session management, action resolution, and player-facing summary formatting.
- [x] Split game/app/src/App.tsx into shell state, replay/bootstrap wiring, autoplay logic, settings persistence, and action plumbing.
- [x] Split the giant stylesheet into component-scoped styles or smaller CSS modules so settings, battlefield, inspect, hover, toast, and hand styles do not live in one monolith.
- [x] For UI refactors, use folder-per-component structure (ComponentName/index.tsx + ComponentName/style.css) so changes stay surgical and ownership is obvious.
- [x] Reduce repeated summary/rendering logic by centralizing display text, tooltip text, and inspect text formatting in shared helpers.
- [x] Replace manual hero/card lookup wiring with a single content registry path that covers definitions, initial listeners, summon blueprints, summon footprints, and active profiles.
- [x] Replace manual effect-handler dispatch with a registry assembled from the same effect source of truth as the schema.
- [ ] Remove duplicated listener-condition matching between schema/model definitions and runtime matching logic.
- [ ] Reduce action/effect/targeting switch fan-out so new kinds do not require patching multiple unrelated files.
- [ ] Consolidate card bootstrap metadata, icon metadata, and starter deck wiring so adding a new card or hero touches one obvious content surface.
- [ ] Strengthen the type model around card definitions, effect payloads, replay payloads, and preview data so the app has fewer unknown and any escape hatches.
- [ ] Keep deterministic systems centralized: RNG, luck, replay encoding, and snapshot/action-log replay should all flow through one path with no duplicated state reconstruction logic.
- [ ] Make player-facing text, calculations, and card implementation details derive from the same typed source so UI summaries cannot drift from engine behavior.
- [ ] Preserve consistent logging and player-facing information by keeping event emission, inspect surfaces, and toast/debug messaging aligned with the underlying action resolution order.
- [x] Split and simplify the app-facing preview surface by moving `game-client-preview` into grouped modules (hero, battlefield, and helpers) with a small compatibility barrel.

## Gameplay

- [x] Add game-over state when one of the heroes dies.
- [ ] Review "destroy" armor mechanics which currently don't work well because most armor in the game is derived not part of the unit's base stats.
- [ ] Add card range indicators on target selection pre-confirmation, Xcom-style. This takes into account the final range including the target's resistances and/or shields or any other effects (e.g. immunity, reflect, etc. and dodge chance and so on, basically all I need to consider before confirming the target / comparing with other targets).
- [x] Prevent toast spam when playing multiple actions quickly (especially on mobile where they fill up the screen).