# pi-gods — Pantheon SDD Agent System

<img src="assets/cover.png" alt="The Pantheon" width="100%" />

A pi extension implementing a fully autonomous multi-agent SDD pipeline.
Thirteen Roman/Greek deities, each owning their domain. Tool boundaries
enforced programmatically. Handoffs detected from the filesystem.
Zero manual routing for the happy path.

## The Pantheon

Thirteen Roman/Greek deities, each commanding their domain. Tool boundaries enforce separation. Handoffs happen at the filesystem — no custom machinery needed.

### 🔍 Read-Only

| Deity     | Role         | Purpose                                                                                                                                               |
| --------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Janus** | Orchestrator | God of doorways, transitions, beginnings and endings. The two-faced gate — reads project state and routes to the right specialist. Never writes code. |

### ✏️ Read/Write

| Deity          | Role            | Purpose                                                                                                                                                                                     |
| -------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Minerva**    | Product Manager | Goddess of wisdom, strategic warfare, and crafts. Born fully armed from Jupiter's head — turns vague requests into crisp PRDs. Asks until every section writes itself.                      |
| **Prometheus** | Architect       | Titan of forethought — his name means "one who thinks ahead." Shaped humanity and gave them fire. Translates PRDs into the simplest viable blueprint, naming every component and trade-off. |
| **Morpheus**   | UX Designer     | God of dreams, shaper of human experience. Constructs entire worlds — designs flows (trigger → steps → success → failure), not screens.                                                     |
| **Plutus**     | Product Owner   | God of wealth — not money, but VALUE. Blinded by Zeus to distribute riches without bias. Orders backlog by first-shippable-value. Cuts scope transparently.                                 |
| **Vesta**      | Scrum Master    | Goddess of the hearth and sacred flame — the fire at the center of Rome. Keeps process integrity and team health. Flags blockers before stories reach Vulcan.                               |
| **Calliope**   | Story Author    | Muse of epic poetry, eldest of the nine — "beautiful-voiced." Writes hyper-detailed stories carrying goal, ACs, architecture excerpts, and out-of-scope guardrails.                         |

### ⚡ Full Access

| Deity          | Role             | Purpose                                                                                                                                                                           |
| -------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vulcan**     | Developer        | God of fire and the forge. Built his kingdom under Mount Etna and forged Jupiter's thunderbolts. Picks a story, implements end-to-end, never leaves the forge broken.             |
| **Nemesis**    | QA               | Goddess of retribution against hubris. Punishes those who claim they are finished when they are not. Takes "done" and tries to falsify it — every defect earns a regression test. |
| **Aquarius**   | Data Engineer    | The water-bearer, Ganymede, cup-bearer to Olympus. Data is water — must flow, be pure, never stagnate. Owns schemas, migrations, queries, and data integrity.                     |
| **Mars Ultor** | Security         | Mars the Avenger — the aspect that defends Rome. Produces STRIDE threat models, scans CVEs, audits secrets and auth flows. No critical or high risks ship.                        |
| **Mercury**    | Release Engineer | Messenger of the gods, fastest of them all, winged sandals. Delivers — conventional commits, changelogs, semver tags, npm publish. One concern per commit.                        |
| **Apollo**     | Documentation    | God of knowledge, truth, and clarity. His oracle spoke in riddles, but he demands precision. Every example must run. Every API doc matches real symbols.                          |

## Autonomous Pipeline

```
User: "Build a todo app with auth"
  │
  ▼   ZERO manual switches below
Janus      → reads project state → writes .pantheon/handoff.json
  │          agent_end detects file → AUTO-SWITCH
Minerva    → asks at most 1 critical question (pipeline pauses)
  │          writes .pantheon/prd.md → handoff → AUTO-SWITCH
Prometheus → writes .pantheon/architecture.md → AUTO-SWITCH
Morpheus   → writes .pantheon/ux-spec.md + DESIGN.md → AUTO-SWITCH
Plutus     → writes .pantheon/epics.md → AUTO-SWITCH
Calliope   → writes .pantheon/stories/*.md → AUTO-SWITCH
Vulcan     → implements, tests pass → AUTO-SWITCH
Nemesis    → adversarial QA (0 defects) → AUTO-SWITCH
Mercury    → commits, changelog, tags release → handoff to Janus
  │
  ▼
DONE. Repeat for next epic.
```

**The pipeline only stops when a deity asks a clarifying question.**
Everything else runs autonomously.

## How Handoffs Work

Handoffs happen automatically — no manual routing needed for the happy path.

### Tool-based handoff (recommended)

Use the `pantheon_handoff` tool (available to all deities):

```
pantheon_handoff({
  to: "vulcan",
  reason: "Story implemented — ready for QA",
  context: "Everything the next deity needs to know..."
})
```

The tool sets a handoff flag and returns `terminate: true`, ending the
current turn immediately — Janus stops without generating a response.
The `agent_end` hook switches to the target deity and defers the handoff
message with `setTimeout(0)`. By the time it fires, the agent is fully idle
and the next turn starts immediately — no user input needed.

### File-based handoff (alternative)

Deities can also create a handoff marker using the standard `write` tool:

```json
// .pantheon/handoff.json
{
  "from": "minerva",
  "to": "prometheus",
  "reason": "PRD complete — ready for architecture",
  "context": "Everything the next deity needs to know..."
}
```

The `agent_end` hook detects the file, parses it, auto-switches the active
deity, and clears the file. No custom pi tools needed — `write` and `bash`
are always available.

**All deities can create handoff files** regardless of their tool policy.
`.pantheon/handoff.json` is whitelisted as pipeline metadata, not a
project artifact.

## The `.pantheon/` Directory

All pipeline artifacts live in one hidden directory — the temple where
the gods work:

```
.pantheon/
├── handoff.json          # Handoff marker (created/cleaned per cycle)
├── prd.md                # Minerva
├── architecture.md       # Prometheus
├── ux-spec.md            # Morpheus
├── DESIGN.md             # Morpheus (design tokens)
├── epics.md              # Plutus
├── qa-report-*.md        # Nemesis
├── threat-model.md       # Mars Ultor
├── data-model.md         # Aquarius
├── security/             # Mars Ultor (audit logs)
├── spikes/               # Prometheus (tech investigations)
└── stories/              # Calliope
    ├── 1.1-server-auth-api.md
    ├── 1.2-auth-middleware.md
    └── 1.3-react-auth-ui.md
```

The dot prefix keeps it hidden in file listings. Everything the pipeline
produces — specs, handoffs, QA reports, stories — lives in one place.
User-facing documentation (README, API docs, examples) stays at the
project root.

## Tool Boundary Enforcement

Every deity has programmatic boundaries enforced at the `tool_call` hook:

| Policy      | Allowed Tools                                          |
| ----------- | ------------------------------------------------------ |
| `readonly`  | `read`, (inspect only), Pantheon tools                 |
| `readwrite` | Above + `write`, `edit`                                |
| `full`      | All tools (destructive patterns still blocked for all) |

**Universal guardrails (all deities):**

- Destructive commands blocked: `rm -rf`, `git push --force`, `DROP TABLE`, fork bombs, pipe-to-bash
- Forbidden paths per deity: e.g., Vulcan can't write to `.pantheon/architecture.md`
- All parameterized — domain-appropriate error messages

**Example:** Janus tries `bash` → blocked: _"Janus (Orchestrator) has 'readonly' access — 'bash' requires higher privileges."_

## Commands

| Command        | Action                                               |
| -------------- | ---------------------------------------------------- |
| `/gods`        | List all 13 deities with active one highlighted      |
| `/gods <name>` | Switch to a deity (e.g., `/gods vulcan`)             |
| `/gods status` | Show current deity, pending handoffs, gate checklist |
| `/gods next`   | Janus inspects project and recommends next deity     |

## Tools

| Tool               | Description                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pantheon_status`  | Display active deity, tool policy, pending handoffs, and routing info                                                                             |
| `pantheon_handoff` | Hand off to another deity. Accepts `to`, `reason`, and `context` parameters. The handoff takes effect immediately — no waiting for the next turn. |

## Extension File Structure

```
pi-gods/
├── index.ts              # Entry: hook registration + /gods command
├── state.ts              # Session-persistent deity state (survives /reload)
├── system-prompt.ts      # Builds per-deity system prompt with voice + gates
├── types.ts              # Core types, tool sets, destructive patterns
├── pantheon/
│   ├── index.ts          # Registry barrel
│   └── definitions.ts    # All 13 deity definitions (pure TypeScript, no YAML)
├── guards/
│   ├── index.ts          # Barrel
│   └── tool-policy.ts    # Tool boundary enforcement + handoff whitelist
└── pipeline/
    ├── index.ts          # Barrel
    ├── handoff.ts        # File-based handoff detection + creation
    └── orchestrator.ts   # Janus routing + state persistence helpers
```

## Deity Definition Shape

Each deity is a typed TypeScript object — no YAML parsing, no frontmatter
extraction, no file-per-agent. A single source of truth in `pantheon/definitions.ts`:

```typescript
{
  name: "vulcan",           // /gods vulcan
  title: "Developer",       // Display role
  role: "...",              // Full role description
  domain: "...",            // Mythological justification
  toolPolicy: "full",       // readonly | readwrite | full
  blockedTools: [],         // Explicitly blocked tools
  blockedPatterns: [],      // Regex patterns to block
  forbiddenPaths: [],       // Paths this deity can't write to
  handoffs: [...],          // Handoff rules (when X → route to Y)
  handoffGate: [],          // Checklist before calling handoff
  voice: [...],             // Voice DNA (how the deity speaks)
  activation: "...",        // First-turn behavior
  capabilities: [...],      // What the deity CAN do
  restrictions: [...],      // What the deity MUST NOT do
  systemPrompt: "...",      // Core operating principles
}
```

## Key Design Decisions

1. **File-based handoff over custom pi tools.** Custom tools depend on pi
   registration quirks. Standard `write`/`bash` always work. The
   `.pantheon/handoff.json` file is visible and debuggable.

2. **Roman methodology over Greek.** Deities chosen for domain fit:
   Janus (two-faced gatekeeper = router), Plutus (blind wealth god =
   unbiased prioritizer), Mars Ultor (defensive war = security), Morpheus
   (dream-shaper = UX). No forced mappings.

3. **Typed definitions over YAML files.** No parsing, no validation
   overhead, no file-per-agent bloat. One file, 13 definitions, full
   TypeScript safety.

4. **Single artifact directory.** `.pantheon/` holds everything the
   pipeline creates. No scattering across `docs/`, `specs/`, `design/`.
   The handoff marker lives alongside the artifacts it governs.

5. **Gate checklists auto-generated.** Each deity's handoff gate is
   inferred from their capabilities and handoff rules. Explicit
   `handoffGate` arrays override the defaults when needed.

## Inspiration

pi-gods was inspired by [ATLAS_OS](https://github.com/lucapohl-angel/ATLAS_OS)
— an SDD CLI that uses Greek deities for its spec-driven development
pipeline. The concept of routing work through named specialists with defined
boundaries and handoff triggers comes from ATLAS_OS's architecture.
pi-gods adapts this to pi extensions with file-based handoff, enforced tool
policies, and an autonomous auto-handoff engine.

## Installation

### Via git (recommended)

```bash
pi install git:github.com/k1lgor/pi-gods
```

### Via npm

```bash
pi install npm:pi-gods
```

### Local

```bash
git clone https://github.com/k1lgor/pi-gods.git
pi install ~/path/to/pi-gods
```

No dependencies beyond what pi provides (`@earendil-works/pi-coding-agent`,
`typebox`, Node.js built-ins).

## License

pi-gods is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
