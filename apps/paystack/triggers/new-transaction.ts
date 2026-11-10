import type { TriggerDefinition } from "@w6w/types";
import transactionList from "../actions/transaction-list.ts";
import { checkSince, PAGE_SIZE } from "../lib/triggers.ts";

interface Item {
  id: number | string;
  createdAt?: string;
  created_at?: string;
}

const trigger: TriggerDefinition = {
  key: "new-transaction",
  title: "New Transaction",
  description:
    "The run gets each new transaction (any status) created on the Paystack integration.",
  output: [
    { key: "id", type: "number", label: "Transaction ID" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: 1234567,
    reference: "ref_8a2k",
    status: "success",
    amount: 500000,
    currency: "NGN",
    createdAt: "2026-11-09T14:08:41.000Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return await checkSince<Item>({
      state,
      ctx,
      list: async (from, page) =>
        ((await transactionList.execute({ perPage: PAGE_SIZE, page, from }, ctx)) as {
          items?: unknown[];
        }).items ?? [],
      idOf: (item) => String(item.id),
      stampOf: (item) => item.createdAt ?? item.created_at,
    });
  },
};

export default trigger;
