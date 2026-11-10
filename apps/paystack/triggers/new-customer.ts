import type { TriggerDefinition } from "@w6w/types";
import customerList from "../actions/customer-list.ts";
import { checkSince, PAGE_SIZE } from "../lib/triggers.ts";

interface Item {
  id: number | string;
  createdAt?: string;
  created_at?: string;
}

const trigger: TriggerDefinition = {
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each customer newly created on the Paystack integration.",
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "customer_code", type: "string", label: "Customer code" },
    { key: "email", type: "string", label: "Email" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: 7654321,
    customer_code: "CUS_c6wqvwmvwopw4ms",
    email: "ada@example.com",
    createdAt: "2026-11-09T14:08:41.000Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return await checkSince<Item>({
      state,
      ctx,
      list: async (from, page, to) =>
        ((await customerList.execute({ perPage: PAGE_SIZE, page, from, to }, ctx)) as {
          items?: unknown[];
        }).items ?? [],
      idOf: (item) => String(item.id),
      stampOf: (item) => item.createdAt ?? item.created_at,
    });
  },
};

export default trigger;
