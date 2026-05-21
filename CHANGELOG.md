# Changelog

## [0.3.0] — 2026-05-21

### Added

- **`autoHandoffRequested` flag** — new field in `PantheonState` for reliable in-memory handoff tracking
- **`isPantheonTool` guard** — `pantheon_status` and `pantheon_handoff` tools always allowed regardless of deity policy
- **Demo project** — calculator CLI (`demo-project/src/`) and todo app with API-key auth

### Fixed

- **Auto-handoff now triggers immediately** — `pi.sendUserMessage` deferred with `setTimeout(0)` so the next turn starts without waiting for user input
- **State sync across module imports** — `state.ts` now mutates in-place via `Object.assign` instead of reassigning the module-level variable, avoiding stale references
- **Handoff tool ends Janus's turn** — `pantheon_handoff` returns `terminate: true`, preventing Janus from generating follow-up text
- **Handoff file error handling** — `detectHandoffFile` separates file-not-found from malformed-JSON, cleans up corrupt files
- **PATCH `completed` validation** — `Store.updateTodo` now rejects non-boolean `completed` values with `TypeError`

### Changed

- **Package renamed** — import path `@mariozechner/pi-coding-agent` → `@earendil-works/pi-coding-agent`
- **Pipeline speed** — auto-handoffs flow through the full deity chain without user intervention
- **README handoff docs** — updated to describe `setTimeout(0)` immediate turn trigger

## [0.2.2] — 2026-05-08

### Added

- `assets/cover.png` — cover image for README header
- `assets/logo.png` — project logo

### Fixed

- Missing PNG assets not tracked in git — now included in package tarball

## [0.2.1] — 2026-05-08

### Changed

- **README Pantheon section redesigned** — compact table format with mythological domain + pipeline purpose per deity
- Removed duplicate access-level summary table for cleaner scanning

## [0.2.0] — 2026-05-07

### Added

- **Auto-handoff fallback** — deities can omit `to` in handoff.json; defaults to Janus (#14)
- **greet.sh demo script** — `demo-project/greet.sh` prints `hello <text>`, proven full 13-deity pipeline
- **Full pipeline test drive** — first end-to-end Janus→Minerva→Prometheus→...→Janus cycle with 0 defects

### Changed

- `parseHandoffFile` — `to` field is now optional, defaults to `"janus"`
- `handoffInstructions` — documents the auto-fallback behavior
- `describeHandoffGate` — last line: "If unsure or task is complete, omit `to` — it defaults to Janus"

## [0.1.2] — 2026-05-07

### Fixed

- npm README not displaying on npmjs.com — republished (registry has readme, CDN needs refresh)

## [0.1.1] — 2026-05-07

### Changed

- Bumped version to 0.1.1 for npm publish
- Added `files` field to package.json for clean npm packages
- Added `pi-package` keyword for pi.dev/packages discoverability
- Added gallery image reference (`pi.image`) in package.json

### Added

- Inspiration section in README crediting ATLAS_OS
- Installation methods: local, git, npm
- MIT LICENSE file

## [0.1.0] — Initial release

### Added

- **pi-gods extension** — Fully autonomous multi-agent SDD pipeline
- 13 Roman/Greek deities with programmatic tool boundary enforcement
- File-based handoff system via `.pantheon/handoff.json`
- Auto-handoff engine in `agent_end` hook
- `/gods` interactive picker, `/gods status`, `/gods next`, `/gods help`
- Deity definitions: Janus, Minerva, Prometheus, Morpheus, Plutus, Vesta, Calliope, Vulcan, Nemesis, Aquarius, Mars Ultor, Mercury, Apollo
- Tool policy system: readonly / readwrite / full
- Handoff whitelist for all deities to create handoff files
- Auto-generated handoff gate checklists from deity capabilities
- Session state persistence via `pi.appendEntry`
- Cover image in `assets/gods.png`
- MIT LICENSE file
- `.gitignore` with node_modules, .pantheon, .pi
- `TODO.md` — planned Terminus (DevOps) and Censor (Code Review) deities

### Documentation

- Full README with deity explanations, autonomous pipeline diagram, installation via local/git/npm
- Expanded deity descriptions — mythological domain, pipeline responsibility, tool boundaries
- Repository metadata in package.json (github.com/k1lgor/pi-gods)

### Demo Project

- `demo-project/hello.js` — Node.js CLI with exported `hello()` function
- `demo-project/hello.test.js` — 7 tests (Vitest), 0 failures
- QA-verified: 7/7 pass, 0 defects, 4 edge-case regression tests
- Tested end-to-end through pipeline: Janus → Vulcan → Nemesis → Mercury
