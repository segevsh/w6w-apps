import type { ActionDefinition } from "@w6w/types";
import { HyrosClient } from "../lib/client.ts";

interface Input {
  saleId: string;
}

const saleDelete: ActionDefinition<Input> = {
  key: "sale-delete",
  type: "perform",
  resource: "sale",
  title: "Delete Sale",
  description: "Permanently delete one sale by its Hyros id.",
  idempotent: true,
  params: [
    {
      key: "saleId",
      label: "Sale ID",
      type: "string",
      required: true,
      hint: "The id from List Sales (sle-...).",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Hyros request id" },
    { key: "result", type: "string", label: '"OK" on success' },
  ],

  execute(input, ctx) {
    return new HyrosClient(ctx).write("DELETE", `/sales/${encodeURIComponent(input.saleId)}`);
  },
};

export default saleDelete;
