import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import action from "../actions/contact-list.ts";
import { pollWindow } from "../lib/window.ts";

/** Re-read this much before the cursor so a record stamped just before the last check is not lost. */
const OVERLAP_MS = 120_000;

type Item = Record<string, unknown>;

/**
 * The window is read whole in one check: `returnAll` walks Front's `page_token` until the window
 * `updated_after = cursor - overlap` is exhausted, so a window longer than one page cannot stall or
 * be cut (brief 9.8) and the window is minutes wide by construction. The seed stores `floor = now`
 * and later checks drop contacts updated before it (brief 9.9).
 */
const SEEN_WINDOW = 5000;

const trigger: TriggerDefinition = {
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each Front contact that is newly created or edited, once per edit.",
  minIntervalMs: 300_000,

  poll({ state, params }, ctx) {
    return pollWindow<Item, number>({
      state,
      now: Date.now(),
      overlapMs: OVERLAP_MS,
      maxPages: 1,
      pageSize: 1,
      seenWindow: SEEN_WINDOW,
      idOf: (i) => String(i.id ?? "") + ":" + String(i.updated_at ?? ""),
      tsOf: (i) => {
        const ms = Number(i.updated_at) * 1000;
        return Number.isFinite(ms) ? ms : undefined;
      },
      async load(sinceMs) {
        const result = await (action as unknown as ActionDefinition).execute(
          { ...(params as Record<string, unknown>), returnAll: true, updatedAfter: sinceMs / 1000 },
          ctx,
        );
        return { items: result as Item[] };
      },
    });
  },
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "handles", type: "array", label: "Handles" },
    { key: "updated_at", type: "number", label: "Updated at (Unix seconds)" },
  ],
  sample: {
    id: "crd_1a2b",
    name: "Ada Lovelace",
    handles: [{ handle: "ada@example.test", source: "email" }],
    updated_at: 1794304800,
  },
};

export default trigger;
