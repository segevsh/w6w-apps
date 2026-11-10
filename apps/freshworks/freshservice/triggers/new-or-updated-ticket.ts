import { pollNewItems } from "../../_shared/poll/mod.ts";
import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import ticketGetMany from "../actions/ticket-get-many.ts";

/** Re-read this much before the cursor so a record stamped just before the last check is not lost. */
const OVERLAP_MS = 120_000;

type Item = Record<string, unknown>;

const trigger: TriggerDefinition = {
  key: "new-or-updated-ticket",
  title: "New or Updated Ticket",
  description:
    "The run gets each Freshservice ticket that is newly created or updated, once per update.",
  minIntervalMs: 300_000,

  async poll({ state, params }, ctx) {
    const prev = (state ?? {}) as { cursor?: unknown };
    const cursor = typeof prev.cursor === "number" ? prev.cursor : undefined;
    const since = (cursor ?? Date.now()) - OVERLAP_MS;
    const result = await (ticketGetMany as unknown as ActionDefinition).execute(
      {
        ...(params as Record<string, unknown>),
        perPage: 100,
        page: 1,
        updatedSince: new Date(since).toISOString(),
      },
      ctx,
    );
    const items = ((result as { tickets?: unknown[] }).tickets ?? []) as Item[];
    const idOf = (i: Item) => String(i.id ?? "") + ":" + String(i.updated_at ?? "");
    const stampOf = (i: Item): number => Date.parse(String(i.updated_at ?? ""));
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
    { key: "id", type: "number", label: "Ticket ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "number", label: "Status" },
    { key: "priority", type: "number", label: "Priority" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    id: 88,
    subject: "Laptop request",
    status: 2,
    priority: 2,
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:05:00Z",
  },
};

export default trigger;
