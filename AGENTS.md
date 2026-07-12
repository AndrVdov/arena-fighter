# Arena Fighter: instructions for coding agents

## Purpose

This file contains durable project rules. Read it before inspecting or changing code. Also read `docs/PROJECT_CONTEXT.md`, `docs/DECISIONS.md`, and `docs/TODO.md` when they are relevant to the task.

## Project overview

Arena Fighter is a single-player browser RPG written in vanilla HTML, CSS, and JavaScript. It has no build step, framework, package manager, or backend. The browser loads scripts from `index.html`, and game progress is stored in `localStorage`.

## Required engineering standards

- Write clean, readable, maintainable code.
- Apply object-oriented design where it improves cohesion and responsibility boundaries; do not introduce inheritance or abstractions without a concrete benefit.
- Follow SOLID, DRY, KISS, and separation-of-concerns principles pragmatically.
- Keep coupling low and each class focused on one clear responsibility.
- Prefer descriptive names over comments that restate the code.
- Avoid global state beyond the existing browser-global architecture unless an architectural migration has been explicitly approved.
- Do not duplicate balance values or content definitions in UI or system code. Put tunable numbers in `js/data/balance.js` and content in the appropriate `js/data/` file.
- Preserve backward compatibility of saved games. When serialized data changes, provide safe defaults or migration logic.
- Treat user-owned and unrelated working-tree changes as immutable unless the task explicitly includes them.

## Architecture boundaries

- `js/data/`: declarative content and balance configuration. No UI behavior.
- `js/entities/`: domain objects and their serialization.
- `js/systems/`: game rules that coordinate domain objects, such as combat, needs, drops, and saving.
- `js/ui/`: rendering and user interaction. UI classes may call game/domain APIs but should not reimplement game rules.
- `js/Game.js`: application lifecycle, screen coordination, navigation, autosave, and global timers.
- `css/style.css`: the current visual layer. Reuse existing tokens and component patterns before adding new variants.
- `assets/`: runtime images and backgrounds. Do not move or rename assets without updating every reference.

All classic scripts are order-dependent. When adding a new file, place its `<script>` tag in `index.html` after its dependencies and before its consumers.

## Product conventions

- User-facing text is Ukrainian. Keep new UI copy in Ukrainian unless the task explicitly requests another language.
- Existing source comments are mixed Russian/Ukrainian. New comments should be concise and consistent within the edited file.
- Preserve the core loop: home, world map, arena or shop, progression, recovery, and repeat.
- Balance changes must be explicit and centralized. Document material balance decisions in `docs/DECISIONS.md`.

## Verification

Run checks proportional to the change. At minimum:

1. Run `node --check` for every changed JavaScript file, or for all files under `js/` after cross-cutting changes.
2. Start a local static server and test the affected flow in a real browser.
3. Inspect browser console errors and warnings.
4. For persistence changes, verify save, reload, and restoration from an existing slot.
5. For UI changes, test both desktop and narrow/mobile layouts when applicable.
6. Review `git diff` and ensure only task-related files changed.

There is currently no automated test suite. Do not claim a change is fully verified when only syntax was checked.

## Git workflow

- Start by reading `git status --short --branch` and recent commits.
- Keep commits focused and use short imperative commit messages.
- Do not rewrite published history or force-push unless the user explicitly asks.
- Do not commit temporary files, local settings, generated experiments, or secrets.
- Update `docs/PROJECT_CONTEXT.md`, `docs/TODO.md`, or `docs/DECISIONS.md` when a completed task makes them stale.
- Push only when the user requests publication or when it is explicitly included in the task.

## Task completion report

State:

- the outcome;
- important files changed;
- checks performed and their results;
- remaining risks, limitations, or follow-up work;
- commit or pull request details when applicable.
