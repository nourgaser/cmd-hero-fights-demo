# Icon Workflow (Iconify + Game Icons)

This document defines how we use the Game Icons set through Iconify in this repo.

## Why this stack

- Source package: `@iconify-json/game-icons`
- Icon set browser: https://icon-sets.iconify.design/game-icons/
- Type/data docs:
  - https://iconify.design/docs/
  - https://iconify.design/docs/types/iconify-info.html
  - https://iconify.design/docs/types/iconify-json.html

What we get:

- Open/free icon data package we can pin in dependencies.
- Stable icon ids in the `game-icons:name` format.
- Data files in standard Iconify structures (`icons.json`, `info.json`).

## Package facts we rely on

- NPM package: `@iconify-json/game-icons`
- Data file format: `icons.json` is `IconifyJSON`.
- Metadata file format: `info.json` is `IconifyInfo`.
- Upstream set license: CC BY 3.0 (attribution required).

## ID convention

Use full Iconify ids with prefix:

- `game-icons:swordman`
- `game-icons:crossed-swords`
- `game-icons:checked-shield`

Do not store raw names without prefix in runtime metadata.

## Recommended app usage

During app integration, choose one render path:

1. Component render path (recommended for React app):
   - Add `@iconify/react`.
   - Render by id string, for example `game-icons:crossed-swords`.
2. Data-driven SVG path (procedural/export use):
   - Read icon data from `@iconify-json/game-icons/icons.json`.
   - Use Iconify Utils to parse or export SVG when needed.

For MVP app speed, path 1 is preferred.

## Procedural icon policy for this game

Choose icons by semantic role, not by card name text.

Base mapping examples:

- Attack / damage: blade, impact, projectile symbols.
- Defense / armor: shield, plate, barrier symbols.
- Healing / sustain: potion, spark, heart symbols.
- Control / debuff: chains, roots, slow/frost symbols.
- Summon / companion: banner, ally, creature symbols.

Then apply style parameters from metadata (size, flip, rotate, color token), not new icon ids, whenever possible.

## Optional runtime metadata shape

If we add icon metadata to runtime content, keep it minimal and serializable.

```ts
export type VisualIconMeta = {
  id: string; // full id, e.g. "game-icons:crossed-swords"
  colorToken?: "neutral" | "attack" | "defense" | "support" | "control";
  rotate?: 0 | 1 | 2 | 3; // 90 degree steps
  hFlip?: boolean;
  vFlip?: boolean;
  scale?: number; // UI multiplier, e.g. 1, 1.25
};

export type VisualMeta = {
  icon?: VisualIconMeta;
};
```

Guidelines:

- Keep `id` stable once assigned (avoid churn in saved snapshots/replays).
- Treat color as UI theme token, not raw hex in content.
- Keep transforms optional and sparse.

## Attribution workflow (CC BY 3.0)

Before shipping any public build using these icons:

1. Include attribution to Game Icons and license in app credits/about.
2. Include link to source set and license text page.
3. Keep attribution visible in repository docs/release notes.

## Team workflow

1. Pick candidate icons from https://icon-sets.iconify.design/game-icons/.
2. Save chosen ids in runtime content visual metadata.
3. Reuse existing ids first; avoid introducing near-duplicates.
4. Prefer metadata transforms over creating multiple equivalent ids.
5. If no suitable icon exists, mark item with TODO and continue gameplay implementation.

## Notes on Iconify data structures

From `IconifyJSON`:

- Required: `prefix`, `icons`
- Optional: `aliases`, default dimensions, metadata
- Icons support transforms (`rotate`, `hFlip`, `vFlip`)

From `IconifyInfo`:

- Required: `name`, `author`, `license`
- Optional: totals, samples, category, palette and display hints

These structures are useful for scripting icon pickers later, but MVP can operate with plain id strings.