/**
 * pi-gods — Orchestrator
 *
 * Janus logic + handoff management. Detects project phase, recommends
 * the next deity, and manages the handoff queue.
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { HandoffEntry, PantheonState } from "../types.js";
import { STATE_ENTRY_TYPE } from "../types.js";
import { getDeity, listDeities } from "../pantheon/definitions.js";

// ── Handoff Queue ────────────────────────────────────────────────────────

/** Create a new handoff entry */
export function createHandoff(
  from: string,
  to: string,
  reason: string,
  context: string,
): HandoffEntry {
  return {
    from,
    to,
    reason,
    context,
    timestamp: Date.now(),
    status: "pending",
  };
}

/** Add a handoff to the state and persist */
export function addHandoff(
  state: PantheonState,
  entry: HandoffEntry,
): PantheonState {
  return {
    ...state,
    handoffs: [...state.handoffs, entry],
  };
}

/** Accept a pending handoff — switches active deity */
export function acceptHandoff(
  state: PantheonState,
  targetDeity: string,
): PantheonState {
  return {
    ...state,
    activeDeity: targetDeity,
    handoffs: state.handoffs.map((h) =>
      h.to === targetDeity && h.status === "pending"
        ? { ...h, status: "accepted" as const }
        : h,
    ),
    activationFired: false,
  };
}

/** Get pending handoffs */
export function pendingHandoffs(state: PantheonState): HandoffEntry[] {
  return state.handoffs.filter((h) => h.status === "pending");
}

// ── Project Phase Detection (lightweight) ────────────────────────────────

interface ProjectPhase {
  phase: string;
  description: string;
  recommendedDeity: string;
}

/**
 * Detects the current project phase based on file presence.
 * This is a lightweight check — the Janus system prompt handles the
 * detailed recommendation logic at runtime.
 */
export function detectPhase(cwd: string, hasUI: boolean): ProjectPhase | null {
  // We can't do filesystem checks here (no fs access in extension context),
  // but we return null and let the LLM handle phase detection via the
  // Janus system prompt which instructs it to read the project files.
  //
  // The orchestrator-level detection would need to be done by reading
  // .pantheon/ files via the read tool, which the LLM handles.
  return null;
}

// ── State Persistence ────────────────────────────────────────────────────

/**
 * Save Pantheon state to the session. Uses pi.appendEntry for persistence
 * across session reloads.
 */
export function persistState(
  state: PantheonState,
  appendEntry: (type: string, data?: unknown) => void,
): void {
  appendEntry(STATE_ENTRY_TYPE, state);
}

/**
 * Load Pantheon state from session entries.
 */
export function loadState(
  getEntries: () => ReadonlyArray<{
    type: string;
    customType?: string;
    data?: unknown;
  }>,
  initialState: PantheonState,
): PantheonState {
  // Walk entries in reverse to find the most recent state
  const entries = getEntries();
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]!;
    if (entry.type === "custom" && entry.customType === STATE_ENTRY_TYPE) {
      const data = entry.data as PantheonState | undefined;
      if (data && data.activeDeity && getDeity(data.activeDeity)) {
        return {
          ...initialState,
          ...data,
          // Don't restore activationFired — each session starts fresh
          activationFired: false,
        };
      }
    }
  }
  return { ...initialState };
}

// ── Formatting Helpers ───────────────────────────────────────────────────

/** Format the deity list for display */
export function formatDeityList(activeDeity: string): string {
  const deities = listDeities();
  const lines: string[] = ["═══ The Pantheon ═══", ""];

  const order = [
    "janus",
    "minerva",
    "prometheus",
    "morpheus",
    "plutus",
    "vesta",
    "calliope",
    "vulcan",
    "nemesis",
    "aquarius",
    "mars",
    "mercury",
    "apollo",
  ];

  for (const name of order) {
    const d = getDeity(name);
    if (!d) continue;
    const marker = name === activeDeity ? "◀ ACTIVE" : "       ";
    const cap =
      d.toolPolicy === "full" ? "⚒" : d.toolPolicy === "readwrite" ? "✎" : "☉";
    lines.push(`  ${marker}  ${cap}  ${d.name.padEnd(12)} ${d.title}`);
  }

  lines.push("");
  lines.push(`☉ = readonly   ✎ = read/write   ⚒ = full access`);
  lines.push(`Switch: /gods <name>   Status: /gods status   Next: /gods next`);

  return lines.join("\n");
}

/** Format current status */
export function formatStatus(state: PantheonState): string {
  const deity = getDeity(state.activeDeity);
  if (!deity) return "No active deity.";

  const lines: string[] = [
    `═══ Active: ${deity.name} (${deity.title}) ═══`,
    `Domain: ${deity.domain}`,
    `Access: ${deity.toolPolicy}`,
    "",
  ];

  const pending = pendingHandoffs(state);
  if (pending.length > 0) {
    lines.push("Pending handoffs:");
    for (const h of pending) {
      lines.push(`  ${h.from} → ${h.to}: ${h.reason}`);
    }
  } else {
    lines.push("No pending handoffs.");
  }

  if (deity.handoffs.length > 0) {
    lines.push("");
    lines.push("Handoff rules:");
    for (const h of deity.handoffs) {
      lines.push(`  → ${h.to} when ${h.when}`);
    }
  }

  return lines.join("\n");
}
