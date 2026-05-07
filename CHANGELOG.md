# Changelog

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
