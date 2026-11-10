import type { TriggerDefinition } from "@w6w/types";
import orderList from "../actions/order-list.ts";
import { PAGE_SIZE, pollSinceWindow } from "../lib/triggers.ts";

type Order = { id?: string; created_at?: string };

const trigger: TriggerDefinition = {
  key: "new-order",
  title: "New Order",
  description:
    "The run gets each Tremendous order created after the trigger was turned on, read through the " +
    "List Orders action with its `created_at[gte]` filter.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: "ORDER123", status: "EXECUTED", created_at: "2026-11-09T10:15:00.000Z" },
  async poll(input, ctx) {
    return await pollSinceWindow<Order>({
      state: input.state,
      async fetchPage(sinceMs, page) {
        const res = await orderList.execute({
          createdAtGte: new Date(sinceMs).toISOString(),
          offset: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        }, ctx) as { orders?: Order[] };
        return res.orders ?? [];
      },
      idOf: (o) => String(o.id ?? ""),
      timestampOf: (o) => o.created_at,
    });
  },
};

export default trigger;
