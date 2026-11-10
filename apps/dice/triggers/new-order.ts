import type { ActionDefinition } from "@w6w/types";
import ordersList from "../actions/orders-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

const rows = (value: unknown): unknown[] => (value as { rows?: unknown[] }).rows ?? [];

export default sinceTrigger<{ eventId?: string }>({
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly purchased DICE order.",
  params: [{
    key: "eventId",
    label: "Event ID",
    type: "string",
    hint: "Only orders for this DICE GraphQL event ID. Leave empty for every event.",
  }],
  async load(since, params, ctx, at) {
    const out: unknown[] = [];
    let after: string | undefined = at;
    let next: string | undefined;
    for (let page = 0; page < 3; page++) {
      const result = await (ordersList as ActionDefinition).execute({
        purchasedAfter: since,
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
  stampOf: (item) => Date.parse(String((item as { purchasedAt?: unknown }).purchasedAt ?? "")) || 0,
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "purchasedAt", type: "string", label: "Purchased at" },
    { key: "quantity", type: "number", label: "Tickets" },
    { key: "total", type: "number", label: "Total" },
    { key: "event", type: "object", label: "Event (id, name, currency)" },
  ],
  sample: {
    id: "ord_1",
    purchasedAt: "2026-11-09T10:00:00Z",
    quantity: 2,
    total: 4200,
    event: { id: "ev_1", name: "Friday Night", currency: "GBP" },
  },
});
