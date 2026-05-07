/**
 * pi-gods — System Prompt Builder
 *
 * Assembles the full deity system prompt from the deity definition,
 * current state, and pipeline context.
 */

import type { DeityDefinition, PantheonState } from "./types.js";
import { getDeity } from "./pantheon/definitions.js";
import {
  describeToolAccess,
  describeBoundaries,
  describeHandoffGate,
} from "./guards/tool-policy.js";
import { handoffInstructions } from "./pipeline/handoff.js";
import { pendingHandoffs } from "./pipeline/orchestrator.js";

/**
 * Build the complete system prompt for the active deity.
 * Injected via `before_agent_start`.
 */
export function buildSystemPrompt(
  deityName: string,
  state: PantheonState,
): string {
  const deity = getDeity(deityName);
  if (!deity) return "";

  const sections: string[] = [];

  // ── Header ──
  sections.push(
    `You are operating as **${deity.name}** — the ${deity.title} in the Pantheon, a fully autonomous spec-driven development pipeline. Each deity owns their domain. When your work is done, you create a handoff file and the system automatically advances to the next deity.`,
  );

  // ── Domain ──
  sections.push(`## Your Domain\n${deity.domain}`);

  // ── Voice ──
  if (deity.voice.length > 0) {
    sections.push(`## Voice\n${deity.voice.map((v) => `- ${v}`).join("\n")}`);
  }

  // ── Activation ──
  if (!state.activationFired && deity.activation) {
    sections.push(`## Activation (this turn only)\n${deity.activation}`);
  }

  // ── Boundaries ──
  sections.push(describeBoundaries(deity));

  // ── Tool Access ──
  sections.push(describeToolAccess(deity));

  // ── Operating Principles ──
  sections.push(`## Operating Principles\n${deity.systemPrompt}`);

  // ── Handoff Gate ──
  const gate = describeHandoffGate(deity);
  if (gate) sections.push(gate);

  // ── Handoff Rules ──
  if (deity.handoffs.length > 0) {
    const targets = deity.handoffs.map((h) => h.to);
    sections.push(
      `## Handoff Rules\n${deity.handoffs
        .map((h) => `- When ${h.when} → handoff to **${h.to}**`)
        .join("\n")}`,
    );
    // Add handoff instructions targeting the primary handoff
    sections.push(handoffInstructions(targets[0]));
  } else {
    // Terminal deity — no automatic handoff
    sections.push(handoffInstructions("janus"));
  }

  // ── Pending Handoffs ──
  const pending = pendingHandoffs(state);
  if (pending.length > 0) {
    sections.push(
      `## Incoming Handoffs\n${pending
        .map(
          (h) => `- From **${h.from}**: ${h.reason}\n  Context: ${h.context}`,
        )
        .join("\n")}`,
    );
  }

  // ── Pipeline Overview ──
  sections.push(
    `## The Pantheon Pipeline\nYou are one of thirteen deities. Pipeline: Janus → Minerva → Prometheus → Morpheus → Plutus → Vesta → Calliope → Vulcan → Nemesis → Aquarius/Mars Ultor → Mercury → Apollo\n\nSwitch manually: \`/gods <name>\` — Status: \`/gods status\``,
  );

  return sections.join("\n\n");
}
