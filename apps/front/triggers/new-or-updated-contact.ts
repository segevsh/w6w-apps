import { pollNewItems } from "../../_shared/poll/mod.ts";
import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import action from "../actions/contact-list.ts";

/** Re-read this much before the cursor so a record stamped just before the last check is not lost. */
const OVERLAP_MS = 120_000;

type Item = Record<string, unknown>;

const trigger: TriggerDefinition = {
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each Front contact that is newly created or edited, once per edit.",
  minIntervalMs: 300_000,

  async poll({ state, params }, ctx) {
    const prev = (state ?? {}) as { cursor?: unknown };
    const cursor = typeof prev.cursor === "number" ? prev.cursor : undefined;
    const since = (cursor ?? Date.now()) - OVERLAP_MS;
    const result = await (action as unknown as ActionDefinition).execute(
      { ...(params as Record<string, unknown>), limit: 100, updatedAfter: since / 1000 },
      ctx,
    );
    const items = result as Item[];
    const idOf = (i: Item) => String(i.id ?? "") + ":" + String(i.updated_at ?? "");
    const stampOf = (i: Item): number => Number(i.updated_at) * 1000;
    const { events, nextState } = await pollNewItems<Item>({
      state,
      fetchPage: () => Promise.resolve({ items }),
      idOf,
    });
    // The cursor only moves to a stamp that was actually emitted.
    const stamps = events.map(stampOf).filter((n) => Number.isFinite(n));
    const base = cursor ?? Date.now();
    return { events, nextState: { ...nextState, cursor: Math.max(base, ...stamps) } };
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
