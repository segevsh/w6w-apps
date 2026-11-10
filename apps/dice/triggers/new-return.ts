import type { ActionDefinition } from "@w6w/types";
import returnsList from "../actions/returns-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

const rows = (value: unknown): unknown[] => (value as { rows?: unknown[] }).rows ?? [];

export default sinceTrigger<{ eventId?: string }>({
  key: "new-return",
  title: "New Return",
  description: "The run gets each newly recorded DICE ticket return.",
  params: [{
    key: "eventId",
    label: "Event ID",
    type: "string",
    hint: "Only returns for this DICE GraphQL event ID. Leave empty for every event.",
  }],
  async load(since, params, ctx) {
    const out: unknown[] = [];
    let after: string | undefined;
    for (let page = 0; page < 3; page++) {
      const result = await (returnsList as ActionDefinition).execute({
        returnedAfter: since,
        first: 100,
        ...(params.eventId ? { eventId: params.eventId } : {}),
        ...(after ? { after } : {}),
      }, ctx) as { rows?: unknown[]; page?: { hasMore?: boolean; nextCursor?: string | null } };
      out.push(...rows(result));
      if (!result.page?.hasMore || !result.page.nextCursor) break;
      after = result.page.nextCursor;
    }
    return out;
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf: (item) => Date.parse(String((item as { returnedAt?: unknown }).returnedAt ?? "")) || 0,
  output: [
    { key: "id", type: "string", label: "Return ID" },
    { key: "ticketId", type: "string", label: "Ticket ID" },
    { key: "returnedAt", type: "string", label: "Returned at" },
    { key: "reason", type: "string", label: "Reason" },
    { key: "order", type: "object", label: "Order (id, purchasedAt)" },
  ],
  sample: {
    id: "ret_1",
    ticketId: "tkt_1",
    returnedAt: "2026-11-09T10:00:00Z",
    reason: "Customer request",
    order: { id: "ord_1", purchasedAt: "2026-11-08T10:00:00Z" },
  },
});
