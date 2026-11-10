import type { TriggerDefinition } from "@w6w/types";
import refundList from "../actions/refund-list.ts";
import { checkSince, PAGE_SIZE } from "../lib/triggers.ts";

interface Item {
  id: number | string;
  createdAt?: string;
  created_at?: string;
}

const trigger: TriggerDefinition = {
  key: "new-refund",
  title: "New Refund",
  description: "The run gets each refund newly created on the Paystack integration.",
  output: [
    { key: "id", type: "number", label: "Refund ID" },
    { key: "transaction_reference", type: "string", label: "Transaction reference" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
    { key: "status", type: "string", label: "Status" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: 2000123,
    transaction_reference: "ref_8a2k",
    amount: 500000,
    status: "pending",
    createdAt: "2026-11-09T14:08:41.000Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return await checkSince<Item>({
      state,
      ctx,
      list: async (from, page, to) =>
        ((await refundList.execute({ perPage: PAGE_SIZE, page, from, to }, ctx)) as {
          items?: unknown[];
        }).items ?? [],
      idOf: (item) => String(item.id),
      stampOf: (item) => item.createdAt ?? item.created_at,
    });
  },
};

export default trigger;
