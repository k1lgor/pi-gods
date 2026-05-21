/**
 * pi-gods — Pantheon SDD Agent System
 *
 * Autonomous multi-agent SDD pipeline with deity-based roles.
 * Deities create `.pantheon/handoff.json` to trigger auto-switching.
 *
 * Commands:  /gods [name]   /gods status   /gods next
 * Install:   ~/.pi/agent/extensions/pi-gods/
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  getDeity,
  listDeities,
  getPipelineOrder,
} from "./pantheon/definitions.js";
import { checkToolAccess } from "./guards/tool-policy.js";
import {
  createHandoff,
  addHandoff,
  acceptHandoff,
  pendingHandoffs,
  detectHandoffFile,
  clearHandoffFile,
  handoffFileToEntry,
  formatDeityList,
  formatStatus,
} from "./pipeline/index.js";
import { buildSystemPrompt } from "./system-prompt.js";
import { Type } from "typebox";
import {
  initState,
  state,
  setState,
  updateState,
  loadState as loadStateFromSession,
} from "./state.js";

// ── Entry Point ──────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  initState(pi);

  // ── session_start: restore persisted state ──
  pi.on("session_start", async (_event, ctx) => {
    const restored = loadStateFromSession(() =>
      ctx.sessionManager.getEntries(),
    );
    setState(restored);

    const deity = getDeity(state.activeDeity);
    const label = deity ? `${deity.name} (${deity.title})` : state.activeDeity;
    ctx.ui.notify(`Pantheon: ${label}`, "info");
    ctx.ui.setStatus(
      "pantheon",
      `${deity?.name ?? "janus"} [${deity?.toolPolicy ?? "readonly"}]`,
    );
  });

  // ── before_agent_start: inject deity system prompt ──
  pi.on("before_agent_start", async (event, _ctx) => {
    const prompt = buildSystemPrompt(state.activeDeity, state);

    if (!state.activationFired) {
      updateState({ activationFired: true });
    }

    return { systemPrompt: event.systemPrompt + "\n\n" + prompt };
  });

  // ── tool_call: enforce deity boundaries ──
  pi.on("tool_call", async (event, ctx) => {
    const deity = getDeity(state.activeDeity);
    if (!deity) return;

    const check = checkToolAccess(
      event.toolName,
      event.input as Record<string, unknown>,
      deity,
    );

    if (check.blocked) {
      if (ctx.hasUI) ctx.ui.notify(`Pantheon: ${check.reason}`, "warning");
      return { block: true, reason: check.reason };
    }
  });

  // ── agent_end: detect handoff file & auto-switch ──
  pi.on("agent_end", async (_event, ctx) => {
    // Primary: detect file-based handoff
    const handoffFile = await detectHandoffFile(ctx.cwd);
    if (handoffFile) {
      const toDeity = getDeity(handoffFile.to);
      if (!toDeity) {
        await clearHandoffFile(ctx.cwd);
        return;
      }

      // Sanitize: the real sender is always the current active deity
      if (handoffFile.from !== state.activeDeity) {
        handoffFile.from = state.activeDeity;
      }

      // Create handoff entry
      const entry = handoffFileToEntry(handoffFile);
      const newState = addHandoff(state, entry);
      const accepted = acceptHandoff(newState, handoffFile.to);
      setState(accepted);

      // Clean up handoff file
      await clearHandoffFile(ctx.cwd);

      if (ctx.hasUI) {
        ctx.ui.notify(
          `Auto-handoff: ${handoffFile.from} → ${toDeity.name} (${toDeity.title})`,
          "success",
        );
        ctx.ui.setStatus("pantheon", `${toDeity.name} [${toDeity.toolPolicy}]`);
      }

      // Kick off the next deity
      // Defer to after agent_end so the agent is truly idle and this triggers a new turn immediately
      setTimeout(() => {
        pi.sendUserMessage(
          `Handoff from **${handoffFile.from}**: ${handoffFile.reason}\n\nContext for ${toDeity.name}: ${handoffFile.context}\n\nYou are now **${toDeity.name}**, the ${toDeity.title}.`,
        );
      }, 0);
      return;
    }

    // Fallback: check autoHandoffRequested flag (from old custom tool path)
    if (!state.autoHandoffRequested) return;
    updateState({ autoHandoffRequested: false });

    const pending = pendingHandoffs(state);
    if (pending.length === 0) return;

    const handoff = pending[0]!;
    const toDeity = getDeity(handoff.to);
    if (!toDeity) return;

    const accepted = acceptHandoff(state, handoff.to);
    setState(accepted);

    if (ctx.hasUI) {
      ctx.ui.notify(
        `Auto-handoff: ${handoff.from} → ${toDeity.name} (${toDeity.title})`,
        "success",
      );
      ctx.ui.setStatus("pantheon", `${toDeity.name} [${toDeity.toolPolicy}]`);
    }

    // Defer to after agent_end so the agent is truly idle and this triggers a new turn immediately
    setTimeout(() => {
      pi.sendUserMessage(
        `Handoff from **${handoff.from}**: ${handoff.reason}\n\nContext: ${handoff.context}\n\nYou are now **${toDeity.name}**, the ${toDeity.title}.`,
      );
    }, 0);
  });

  // ── Command: /gods ──────────────────────────────────────────────────
  pi.registerCommand("gods", {
    description: "Pantheon: list, switch, or check deity status",
    handler: async (args, ctx) => {
      let sub = args.trim().toLowerCase();
      if (sub.startsWith(":")) sub = sub.slice(1);

      // /gods — list
      // /gods — interactive deity picker
      if (!sub) {
        if (!ctx.hasUI) return;

        const active = state.activeDeity;
        const options = getPipelineOrder().map((d) => {
          const icon =
            d.toolPolicy === "full"
              ? "⚒"
              : d.toolPolicy === "readwrite"
                ? "✎"
                : "☉";
          const marker = d.name === active ? " ◀" : "";
          return `${icon}  ${d.name.padEnd(14)} ${d.title}${marker}`;
        });

        const choice = await ctx.ui.select("Choose a deity:", options);
        if (!choice) return;

        // Extract deity name from the formatted choice
        const match = choice.match(/^[☉✎⚒]  (\w+)\s/);
        if (!match?.[1]) return;
        sub = match[1];
        // Fall through to the switch logic below
      }

      // /gods status
      // /gods help — usage overview
      if (sub === "help") {
        if (ctx.hasUI) {
          ctx.ui.notify(
            "/gods — pick a deity\n/gods <name> — switch directly\n/gods status — current deity + handoffs\n/gods next — Janus recommendation\n/gods help — this info",
            "info",
          );
        }
        return;
      }

      // /gods status — inline info, no persistent widget
      if (sub === "status") {
        if (ctx.hasUI) {
          const d = getDeity(state.activeDeity);
          const pending = pendingHandoffs(state).length;
          const next = d?.handoffs.map((h) => h.to).join(", ") ?? "none";
          ctx.ui.setWidget("pantheon", []); // clear any stale widget
          ctx.ui.notify(
            `${d?.name ?? "?"} (${d?.title ?? "?"}) · ${d?.toolPolicy ?? "?"} · ${pending} handoff(s) pending · next: ${next}`,
            "info",
          );
        }
        return;
      }

      // /gods next — Janus routing
      if (sub === "next") {
        const prev = state.activeDeity;
        updateState({ activeDeity: "janus", activationFired: false });
        ctx.ui?.notify?.("Routing through Janus...", "info");
        ctx.ui?.setStatus?.("pantheon", "janus [readonly]");
        setTimeout(() => {
          pi.sendUserMessage(
            `You are Janus, the Orchestrator. Previous deity: ${prev}. Inspect the project and recommend: NEXT: <action> | WHY: <reason> | HOW: /gods <name>`,
          );
        }, 0);
        return;
      }

      // /gods <name> — switch
      const deity = getDeity(sub);
      if (!deity) {
        ctx.ui?.notify?.(
          `Unknown deity: "${sub}". Use /gods to list.`,
          "error",
        );
        return;
      }

      const prevName = getDeity(state.activeDeity)?.name ?? state.activeDeity;
      updateState({ activeDeity: deity.name, activationFired: false });

      ctx.ui?.notify?.(
        `${prevName} → ${deity.name} (${deity.title}) [${deity.toolPolicy}]`,
        "success",
      );
      ctx.ui?.setStatus?.("pantheon", `${deity.name} [${deity.toolPolicy}]`);

      // Accept any pending handoff to this deity
      const p = pendingHandoffs(state);
      if (p.some((h) => h.to === deity.name)) {
        const accepted = acceptHandoff(state, deity.name);
        setState(accepted);
      }

      setTimeout(() => {
        pi.sendUserMessage(
          `You are now **${deity.name}**, the ${deity.title}.`,
        );
      }, 0);
    },
  });

  // ── Tools: pantheon_status ──────────────────────────────────────────────

  pi.registerTool({
    name: "pantheon_status",
    label: "Pantheon Status",
    description:
      "Display the current Pantheon status — active deity, tool policy, pending handoffs, and routing info",
    parameters: Type.Object({}),
    executionMode: "foreground",
    execute: async (_toolCallId, _params, _signal, _onUpdate, ctx) => {
      const d = getDeity(state.activeDeity);
      if (!d) return { content: [{ type: "text", text: "No active deity." }] };
      const pending = pendingHandoffs(state).length;
      const next =
        d.handoffs.length > 0 ? d.handoffs.map((h) => h.to).join(", ") : "none";
      const lines = [
        `Active: ${d.name} (${d.title})`,
        `Access: ${d.toolPolicy}`,
        `Pending handoffs: ${pending}`,
        `Next: ${next}`,
        `Domain: ${d.domain}`,
      ];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  });

  // ── Tools: pantheon_handoff ─────────────────────────────────────────────

  pi.registerTool({
    name: "pantheon_handoff",
    label: "Pantheon Handoff",
    description:
      "Hand off to another deity. Creates a handoff entry and automatically switches to the target deity on the next turn.",
    parameters: Type.Object({
      to: Type.String({
        description: "Target deity name to hand off to",
      }),
      reason: Type.String({
        description: "Why the handoff is needed (one sentence)",
      }),
      context: Type.String({
        description:
          "Context for the next deity — decisions made, files created, remaining questions",
      }),
    }),
    executionMode: "foreground",
    execute: async (_toolCallId, params, _signal, _onUpdate, ctx) => {
      const toDeity = getDeity(params.to);
      if (!toDeity) {
        return {
          content: [
            {
              type: "text",
              text: `Unknown deity: "${params.to}". Use /gods to list available deities.`,
            },
          ],
        };
      }
      if (toDeity.name === state.activeDeity) {
        return {
          content: [
            {
              type: "text",
              text: `Already acting as ${toDeity.name}. No handoff needed.`,
            },
          ],
        };
      }
      const fromName = getDeity(state.activeDeity)?.name ?? state.activeDeity;
      const entry = createHandoff(
        fromName,
        toDeity.name,
        params.reason,
        params.context,
      );
      const newState = addHandoff(state, entry);
      setState({ ...newState, autoHandoffRequested: true });
      if (ctx.hasUI) {
        ctx.ui.notify(
          `Handoff queued: ${fromName} → ${toDeity.name} (${toDeity.title})`,
          "info",
        );
      }
      return {
        content: [
          {
            type: "text",
            text: `Handoff queued from ${fromName} to ${toDeity.name} (${toDeity.title}).\n\nReason: ${params.reason}\nContext: ${params.context}`,
          },
        ],
        terminate: true,
      };
    },
  });
}
