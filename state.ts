/**
 * pi-gods — State Management
 *
 * Persists PantheonState to the pi session via appendEntry.
 * Survives session reloads and compactions.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { PantheonState } from "./types.js";
import { DEFAULT_STATE, STATE_ENTRY_TYPE } from "./types.js";
import { getDeity } from "./pantheon/definitions.js";

let _appendEntry: ((type: string, data?: unknown) => void) | null = null;

/** Initialize the persistence backend */
export function initState(pi: ExtensionAPI): void {
  _appendEntry = (type, data) => pi.appendEntry(type, data);
}

/** Save current state to the session */
export function saveState(state: PantheonState): void {
  if (_appendEntry) {
    _appendEntry(STATE_ENTRY_TYPE, state);
  }
}

/**
 * Load state from session entries.
 * Walks entries in reverse to find the most recent state snapshot.
 */
export function loadState(
  getEntries: () => ReadonlyArray<{
    type: string;
    customType?: string;
    data?: unknown;
  }>,
): PantheonState {
  const entries = getEntries();
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]!;
    if (entry.type === "custom" && entry.customType === STATE_ENTRY_TYPE) {
      const data = entry.data as PantheonState | undefined;
      if (data?.activeDeity && getDeity(data.activeDeity)) {
        return {
          ...DEFAULT_STATE,
          ...data,
          activationFired: false,
          autoHandoffRequested: false,
        };
      }
    }
  }
  return { ...DEFAULT_STATE };
}

/** Module-level state, exported for direct access by hooks */
export const state: PantheonState = { ...DEFAULT_STATE };

/** Reset state to a new value and persist */
export function setState(newState: PantheonState): void {
  // Mutate in-place so all importers see changes immediately
  // (avoids ES module live-binding issues across runtimes)
  for (const key of Object.keys(state)) {
    delete (state as Record<string, unknown>)[key];
  }
  Object.assign(state, newState);
  saveState(state);
}

/** Update state with a partial and persist */
export function updateState(patch: Partial<PantheonState>): void {
  Object.assign(state, patch);
  saveState(state);
}
