import type { ActionDefinition } from "@w6w/types";
import transfersList from "../actions/ticket-transfers-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

const rows = (value: unknown): unknown[] => (value as { rows?: unknown[] }).rows ?? [];

export default sinceTrigger<{ eventId?: string }>({
  key: "new-ticket-transfer",
  title: "New Ticket Transfer",
  description: "The run gets each newly recorded DICE ticket transfer.",
  params: [{
    key: "eventId",
    label: "Event ID",
    type: "string",
    hint: "Only transfers for this DICE GraphQL event ID. Leave empty for every event.",
  }],
  async load(since, params, ctx, at) {
    const out: unknown[] = [];
    let after: string | undefined = at;
    let next: string | undefined;
    for (let page = 0; page < 3; page++) {
      const result = await (transfersList as ActionDefinition).execute({
        transferredAfter: since,
        first: 100,
        ...(params.eventId ? { eventId: params.eventId } : {}),
        ...(after ? { after } : {}),
      }, ctx) as { rows?: unknown[]; page?: { hasMore?: boolean; nextCursor?: string | null } };
      out.push(...rows(result));
      if (!result.page?.hasMore || !result.page.nextCursor) break;
      after = result.page.nextCursor;
      if (page === 2) next = after;
    }
    return { items: out, next };
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf: (item) =>
    Date.parse(String((item as { transferredAt?: unknown }).transferredAt ?? "")) || 0,
  output: [
    { key: "id", type: "string", label: "Transfer ID" },
    { key: "transferredAt", type: "string", label: "Transferred at" },
    { key: "tickets", type: "array", label: "Tickets (ids)" },
    { key: "orders", type: "array", label: "Orders (ids)" },
  ],
  sample: {
    id: "trf_1",
    transferredAt: "2026-11-09T10:00:00Z",
    tickets: [{ id: "tkt_1" }],
    orders: [{ id: "ord_1" }],
  },
});
