/**
 * pi-gods — Guards
 *
 * Tool boundary enforcement. Every deity has a domain — tools outside
 * that domain are blocked. Dangerous commands are blocked for everyone.
 */

import type { DeityDefinition, ToolPolicy } from "../types.js";
import { DESTRUCTIVE_PATTERNS, READONLY_TOOLS, WRITE_TOOLS } from "../types.js";

// ── Core Guard Logic ─────────────────────────────────────────────────────

export interface GuardResult {
  blocked: boolean;
  reason?: string;
}

export function checkToolAccess(
  toolName: string,
  toolInput: Record<string, unknown>,
  deity: DeityDefinition,
): GuardResult {
  // 0. ALWAYS allow handoff file creation (pipeline metadata, not project artifact)
  if (isHandoffFileOp(toolName, toolInput)) {
    return { blocked: false };
  }

  // 1. Destructive patterns (applies to ALL deities)
  const destructiveCheck = checkDestructivePatterns(toolName, toolInput);
  if (destructiveCheck.blocked) return destructiveCheck;

  // 2. Explicit blocked tools
  if (deity.blockedTools.includes(toolName)) {
    return {
      blocked: true,
      reason: `${deity.name} (${deity.title}) cannot use "${toolName}" — outside their domain.`,
    };
  }

  // 3. Tool policy
  const policyCheck = checkToolPolicy(toolName, deity.toolPolicy);
  if (policyCheck.blocked) {
    return {
      blocked: true,
      reason: `${deity.name} (${deity.title}) has '${deity.toolPolicy}' access — "${toolName}" requires higher privileges.`,
    };
  }

  // 4. Forbidden paths for write/edit
  if (toolName === "write" || toolName === "edit") {
    const pathCheck = checkForbiddenPaths(toolInput, deity);
    if (pathCheck.blocked) return pathCheck;
  }

  return { blocked: false };
}

function checkToolPolicy(toolName: string, policy: ToolPolicy): GuardResult {
  if (policy === "full") return { blocked: false };

  if (policy === "readonly" && !READONLY_TOOLS.has(toolName)) {
    return {
      blocked: true,
      reason: `Tool "${toolName}" is not available in readonly mode.`,
    };
  }

  if (policy === "readwrite") {
    const allowed = READONLY_TOOLS.has(toolName) || WRITE_TOOLS.has(toolName);
    if (!allowed) {
      return {
        blocked: true,
        reason: `Tool "${toolName}" is not available in readwrite mode.`,
      };
    }
  }

  return { blocked: false };
}

function checkDestructivePatterns(
  toolName: string,
  input: Record<string, unknown>,
): GuardResult {
  if (toolName !== "bash") return { blocked: false };
  const command = String(input.command ?? "");
  if (!command) return { blocked: false };

  for (const pattern of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(command)) {
      return {
        blocked: true,
        reason: `Destructive command pattern detected: "${pattern.source}". Requires explicit user confirmation.`,
      };
    }
  }

  return { blocked: false };
}

function checkForbiddenPaths(
  input: Record<string, unknown>,
  deity: DeityDefinition,
): GuardResult {
  if (deity.forbiddenPaths.length === 0) return { blocked: false };
  const path = String(input.path ?? "");
  if (!path) return { blocked: false };

  for (const forbidden of deity.forbiddenPaths) {
    if (
      path.startsWith(forbidden) ||
      path.includes(`/${forbidden}`) ||
      path === forbidden
    ) {
      const owner =
        deity.title === "Developer"
          ? "the protected list"
          : deity.title === "Product Manager"
            ? "Prometheus"
            : "another deity";
      return {
        blocked: true,
        reason: `${deity.name} cannot write to "${path}" — in ${owner}'s domain.`,
      };
    }
  }

  return { blocked: false };
}

// ── Handoff File Whitelist ───────────────────────────────────────────────

/**
 * Detect operations on the handoff file. These are always allowed
 * regardless of tool policy — handoff files are pipeline metadata,
 * not project artifacts owned by any deity's domain.
 */
function isHandoffFileOp(
  toolName: string,
  input: Record<string, unknown>,
): boolean {
  // write/edit to .pantheon/handoff.json
  if (toolName === "write" || toolName === "edit") {
    const path = String(input.path ?? "");
    if (path.includes(".pantheon/handoff.json")) return true;
  }
  // bash writing to .pantheon/handoff.json (echo/cat > .pantheon/...)
  if (toolName === "bash") {
    const cmd = String(input.command ?? "");
    if (cmd.includes(".pantheon/handoff.json")) return true;
  }
  return false;
}

// ── System Prompt: Tool Access ───────────────────────────────────────────

export function describeToolAccess(deity: DeityDefinition): string {
  switch (deity.toolPolicy) {
    case "readonly":
      return `## Available tools\nYou have **read-only** access. Read files, search knowledge, inspect containers. You cannot write, edit, or execute commands — ${deity.title}s route and advise, they do not build.`;
    case "readwrite":
      return `## Available tools\nYou have **read-write** access. Read any file, search knowledge, write/edit documents within your authorized sections. No terminal commands.${deity.blockedTools.length > 0 ? ` Blocked: ${deity.blockedTools.map((t) => "`" + t + "`").join(", ")}.` : ""}`;
    case "full":
      return `## Available tools\nYou have **full** access to all development tools. Use them responsibly within your domain.${deity.blockedTools.length > 0 ? ` Restricted: ${deity.blockedTools.map((t) => "`" + t + "`").join(", ")}.` : ""}`;
  }
}

// ── System Prompt: Boundaries ────────────────────────────────────────────

export function describeBoundaries(deity: DeityDefinition): string {
  const parts: string[] = ["## Domain Boundaries\n"];

  parts.push("### You are authorized to:");
  for (const cap of deity.capabilities) parts.push(`- ${cap}`);

  parts.push("\n### You are FORBIDDEN from:");
  for (const res of deity.restrictions) parts.push(`- ${res}`);

  if (deity.authorizedSections?.length) {
    parts.push(
      `\n### Authorized sections: ${deity.authorizedSections.map((s) => `\`${s}\``).join(", ")}`,
    );
  }
  if (deity.forbiddenSections?.length) {
    parts.push(
      `### Forbidden sections: ${deity.forbiddenSections.map((s) => `\`${s}\``).join(", ")}`,
    );
  }
  if (deity.forbiddenPaths.length > 0) {
    parts.push(
      `\n### Protected paths: ${deity.forbiddenPaths.map((p) => `\`${p}\``).join(", ")}`,
    );
  }

  return parts.join("\n");
}

// ── System Prompt: Handoff Gate ──────────────────────────────────────────

/**
 * Build the auto-handoff gate section. Each deity gets a checklist they
 * MUST verify before calling pantheon_handoff. If explicit handoffGate
 * values exist on the deity definition, use those. Otherwise, infer
 * sensible gates from capabilities and handoff rules.
 */
export function describeHandoffGate(deity: DeityDefinition): string {
  const gates =
    (deity.handoffGate?.length ?? 0) > 0
      ? deity.handoffGate!
      : inferHandoffGate(deity);

  if (gates.length === 0 && deity.handoffs.length === 0) return "";

  const lines: string[] = [
    "## AUTO-HANDOFF GATE",
    "",
    "**When you call `pantheon_handoff`, the system automatically switches to the target deity on the next turn. No user confirmation needed.**",
    "",
    "**If you need user input:** Do NOT call `pantheon_handoff`. Just ask. The pipeline pauses until they respond.",
    "",
    "**Before calling pantheon_handoff, verify ALL of these:**",
    "",
  ];

  for (const item of gates) {
    lines.push(`- [ ] ${item}`);
  }

  lines.push("");

  if (deity.handoffs.length > 0) {
    const targets = [...new Set(deity.handoffs.map((h) => h.to))].join(" or ");
    lines.push(
      `All checked? → pantheon_handoff(to: "${targets}", reason: "<why>", context: "<what they need>")`,
    );
  }

  return lines.join("\n");
}

/** Infer sensible handoff gates from a deity's capabilities and handoff rules. */
function inferHandoffGate(deity: DeityDefinition): string[] {
  const gates: string[] = [];

  // Turn capabilities into "Verified: ..." checklist items (first 3)
  for (const cap of deity.capabilities.slice(0, 3)) {
    const verb = cap.charAt(0).toLowerCase() + cap.slice(1);
    gates.push(`Verified: ${verb}`);
  }

  // Add handoff conditions
  for (const h of deity.handoffs.slice(0, 2)) {
    gates.push(`Condition met: ${h.when}`);
  }

  if (gates.length === 0) {
    gates.push("All work for this phase is complete");
    gates.push("No unresolved questions or ambiguities remain");
    gates.push("Context for the next deity is documented");
  }

  return gates;
}
