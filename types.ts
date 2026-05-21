/**
 * pi-gods — Pantheon SDD agent system
 *
 * Shared types for deity definitions, handoffs, boundaries, and session state.
 */

// ── Tool Policy ──────────────────────────────────────────────────────────
export type ToolPolicy = "readonly" | "readwrite" | "full";

// ── Handoff ──────────────────────────────────────────────────────────────
export interface HandoffRule {
  /** Target deity name */
  to: string;
  /** Natural-language condition that triggers this handoff */
  when: string;
}

export interface HandoffEntry {
  from: string;
  to: string;
  reason: string;
  context: string;
  timestamp: number;
  status: "pending" | "accepted" | "declined";
}

// ── Deity Definition ─────────────────────────────────────────────────────
export interface DeityDefinition {
  /** Lowercase name used in commands: /gods:janus */
  name: string;
  /** Display title: "Orchestrator" */
  title: string;
  /** Full role description */
  role: string;
  /** Mythological domain — WHY this deity fits */
  domain: string;
  /** Tool access policy */
  toolPolicy: ToolPolicy;
  /** Tools this deity is explicitly forbidden from using (overrides policy) */
  blockedTools: string[];
  /** Regex patterns that block tool execution even if tool is allowed */
  blockedPatterns: RegExp[];
  /** Filesystem paths this deity cannot write to */
  forbiddenPaths: string[];
  /** Handoff rules: when X happens, route to Y */
  handoffs: HandoffRule[];
  /** Voice DNA — how this deity speaks */
  voice: string[];
  /** First-turn activation instructions */
  activation: string;
  /** Capabilities — what this deity CAN do (natural language, for system prompt) */
  capabilities: string[];
  /** Restrictions — what this deity MUST NOT do (natural language, for system prompt) */
  restrictions: string[];
  /** Core system prompt body */
  systemPrompt: string;
  /** Authorized document sections (for story/spec-aware editing) */
  authorizedSections?: string[];
  /** Forbidden document sections */
  forbiddenSections?: string[];
}

// ── Session State ────────────────────────────────────────────────────────
export interface PantheonState {
  activeDeity: string;
  handoffs: HandoffEntry[];
  activationFired: boolean; // whether activation message was sent this session
  autoHandoffRequested: boolean; // whether pantheon_handoff tool was called this turn
}

export const DEFAULT_STATE: PantheonState = {
  activeDeity: "janus",
  handoffs: [],
  activationFired: false,
  autoHandoffRequested: false,
};

export const STATE_ENTRY_TYPE = "pantheon-state";

// ── Read-only tools (always safe) ────────────────────────────────────────
export const READONLY_TOOLS = new Set(["read"]);

// ── Write tools ──────────────────────────────────────────────────────────
export const WRITE_TOOLS = new Set(["write", "edit"]);

// ── Destructive patterns (checked for ALL deities including full-access) ──
export const DESTRUCTIVE_PATTERNS: RegExp[] = [
  /\brm\s+-rf\b/,
  /\bgit\s+push\s+(-f|--force)\b/,
  /\bgit\s+push\s+.*--delete\b/,
  /\bDROP\s+(TABLE|DATABASE)\b/i,
  /\bTRUNCATE\b/i,
  /\bDEL\s+.*\*.*\bFROM\b/i,
  /\bchmod\s+777\b/,
  /\b:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?\s*:/, // fork bomb
  /\bcurl.*\|\s*(ba)?sh\b/,
];
