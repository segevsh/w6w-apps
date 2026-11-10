import { pollNewItems } from "../../_shared/poll/mod.ts";
import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import contactList from "../actions/contact-list.ts";

/** Re-read this much before the cursor so a record stamped just before the last check is not lost. */
const OVERLAP_MS = 120_000;

type Item = Record<string, unknown>;

const trigger: TriggerDefinition = {
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description:
    "The run gets each Givebutter contact that is newly created or edited, once per edit.",
  minIntervalMs: 300_000,

  async poll({ state, params }, ctx) {
    const prev = (state ?? {}) as { cursor?: unknown };
    const cursor = typeof prev.cursor === "number" ? prev.cursor : undefined;
    const since = (cursor ?? Date.now()) - OVERLAP_MS;
    const result = await (contactList as unknown as ActionDefinition).execute(
      {
        ...(params as Record<string, unknown>),
        page: 1,
        per_page: 100,
        updatedAfter: new Date(since).toISOString(),
      },
      ctx,
    );
    const items = ((result as { data?: unknown[] }).data ?? []) as Item[];
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
    { key: "id", type: "number", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "primary_email", type: "string", label: "Primary email" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    id: 3301,
    first_name: "Ada",
    last_name: "Lovelace",
    primary_email: "ada@example.test",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:05:00Z",
  },
};

export default trigger;
