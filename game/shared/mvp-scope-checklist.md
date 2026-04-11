# MVP Scope Checklist (Commander X)

Active-only tracker. Completed tasks, draft specs, and stale planning notes were removed.

## Remaining MVP Tasks

### Scalability / Maintainability
- [ ] Break up the largest source files first (game/app/src/App.css, game/app/src/game-client.ts, game/app/src/App.tsx, game/app/src/components/SettingsPanel.tsx, game/app/src/components/DebugStatePanel.tsx, game/engine/actions/effects/handlers/combat.ts, game/engine/actions/effects/handlers/stats.ts) so no single file keeps absorbing unrelated responsibilities.
- [ ] Split game/app/src/game-client.ts into smaller modules for preview derivation, replay/session management, action resolution, and player-facing summary formatting.
- [ ] Split game/app/src/App.tsx into shell state, replay/bootstrap wiring, autoplay logic, settings persistence, and action plumbing.
- [ ] Split the giant stylesheet into component-scoped styles or smaller CSS modules so settings, battlefield, inspect, hover, toast, and hand styles do not live in one monolith.
- [ ] Reduce repeated summary/rendering logic by centralizing display text, tooltip text, and inspect text formatting in shared helpers.
- [ ] Replace manual hero/card lookup wiring with a single content registry path that covers definitions, initial listeners, summon blueprints, summon footprints, and active profiles.
- [ ] Replace manual effect-handler dispatch with a registry assembled from the same effect source of truth as the schema.
- [ ] Remove duplicated listener-condition matching between schema/model definitions and runtime matching logic.
- [ ] Reduce action/effect/targeting switch fan-out so new kinds do not require patching multiple unrelated files.
- [ ] Consolidate card bootstrap metadata, icon metadata, and starter deck wiring so adding a new card or hero touches one obvious content surface.
- [ ] Strengthen the type model around card definitions, effect payloads, replay payloads, and preview data so the app has fewer unknown and any escape hatches.
- [ ] Keep deterministic systems centralized: RNG, luck, replay encoding, and snapshot/action-log replay should all flow through one path with no duplicated state reconstruction logic.
- [ ] Make player-facing text, calculations, and card implementation details derive from the same typed source so UI summaries cannot drift from engine behavior.
- [ ] Preserve consistent logging and player-facing information by keeping event emission, inspect surfaces, and toast/debug messaging aligned with the underlying action resolution order.
- [ ] Split or simplify the largest app-facing preview file if it keeps accumulating formatting, tooltip, summon-preview, and cast-condition logic in one place.

### Product / UX Backlog
- [ ] Add tutorial / rulebook.
