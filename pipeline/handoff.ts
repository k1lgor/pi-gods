/**
 * pi-gods — File-Based Handoff Engine
 *
 * Instead of relying on custom pi tools (which may not appear in the LLM's
 * tool list), deities create a `.pantheon/handoff.json` file using
 * standard `write` or `bash` tools. The agent_end hook detects this file
 * and triggers the auto-switch.
 *
 * This is more reliable because:
 *   1. write/bash are always available
 *   2. The handoff file is visible in the filesystem
 *   3. No dependency on custom tool registration quirks
 */

import { mkdir, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { HandoffEntry } from "../types.js";

// ── Handoff File Schema ──────────────────────────────────────────────────

/** The JSON shape the LLM writes to `.pantheon/handoff.json` */
export interface HandoffFile {
  from: string;
  to: string;
  reason: string;
  context: string;
}

/** Validate and normalize a raw handoff file object */
export function parseHandoffFile(raw: unknown): HandoffFile | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.from === "string" &&
    typeof obj.to === "string" &&
    typeof obj.reason === "string" &&
    typeof obj.context === "string"
  ) {
    return {
      from: obj.from.toLowerCase().trim(),
      to: obj.to.toLowerCase().trim(),
      reason: obj.reason.trim(),
      context: obj.context.trim(),
    };
  }
  return null;
}

// ── Handoff File Detection ───────────────────────────────────────────────

const HANDOFF_DIR = ".pantheon";
const HANDOFF_FILE = "handoff.json";

/**
 * Check for a handoff file in the project directory.
 * Returns the parsed handoff data if a valid file exists, null otherwise.
 */
export async function detectHandoffFile(
  cwd: string,
): Promise<HandoffFile | null> {
  const filePath = join(cwd, HANDOFF_DIR, HANDOFF_FILE);

  try {
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return parseHandoffFile(data);
  } catch {
    return null;
  }
}

/**
 * Remove the handoff file after it's been processed.
 * Silently ignores errors (file may already be gone).
 */
export async function clearHandoffFile(cwd: string): Promise<void> {
  const filePath = join(cwd, HANDOFF_DIR, HANDOFF_FILE);
  try {
    await unlink(filePath);
  } catch {
    // No-op: file already removed or never existed
  }
}

// ── Handoff File → HandoffEntry ──────────────────────────────────────────

/**
 * Convert a detected HandoffFile into a full HandoffEntry.
 */
export function handoffFileToEntry(file: HandoffFile): HandoffEntry {
  return {
    from: file.from,
    to: file.to,
    reason: file.reason,
    context: file.context,
    timestamp: Date.now(),
    status: "pending",
  };
}

// ── System Prompt Instructions ───────────────────────────────────────────

/**
 * Build the handoff instructions that go into every deity's system prompt.
 * Tells the LLM exactly how to trigger a handoff using standard tools.
 */
export function handoffInstructions(targetDeityHint?: string): string {
  const target = targetDeityHint ?? "the next deity";
  return `## HOW TO HANDOFF (AUTO-PIPELINE)

When your work for this phase is complete and you have verified ALL items in the HANDOFF GATE above:

1. Create the file \`.pantheon/handoff.json\` using the \`write\` tool with this exact structure:

\`\`\`json
{
  "from": "YOUR_DEITY_NAME",
  "to": "${target}",
  "reason": "One sentence explaining why the handoff is needed",
  "context": "Everything the next deity needs to know — decisions made, files created, remaining questions"
}
\`\`\`

2. The system will detect this file automatically and switch to ${target} on the next turn.

3. **IMPORTANT:** If you need user input or have a clarifying question, do NOT create this file. Just ask the user directly. The pipeline pauses until they respond — then you continue and handoff when ready.

4. The \`.pantheon/\` directory is created automatically — just write the file.`;
}
