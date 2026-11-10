import type { ActionDefinition } from "@w6w/types";
import eventList from "../actions/event-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

export default sinceTrigger({
  key: "new-event",
  title: "New Event",
  description: "The run gets each new Drata audit event (who changed what, when).",
  async load(since, _params, ctx, at) {
    const out: unknown[] = [];
    let cursor: string | undefined = at;
    let next: string | undefined;
    for (let page = 0; page < 3; page++) {
      const result = await (eventList as ActionDefinition).execute({
        createdAtStartDate: since,
        size: 100,
        ...(cursor ? { cursor } : {}),
      }, ctx) as { items?: unknown[]; nextCursor?: string | null };
      out.push(...(result.items ?? []));
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
      if (page === 2) next = cursor;
    }
    return { items: out, next };
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf: (item) => Date.parse(String((item as { createdAt?: unknown }).createdAt ?? "")) || 0,
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "type", type: "string", label: "Event type" },
    { key: "category", type: "string", label: "Category" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "description", type: "string", label: "Description" },
  ],
  sample: {
    id: "evt_1",
    type: "EMPLOYMENT_STATUS_UPDATED",
    category: "PERSONNEL",
    createdAt: "2026-11-09T10:00:00.000Z",
    description: "Employment status updated",
  },
});
