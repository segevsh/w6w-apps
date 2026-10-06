import type { ActionDefinition } from "@w6w/types";
import { EconomicClient, seg } from "../lib/client.ts";

const customerDelete: ActionDefinition<{ customerNumber: number }> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description:
    "Delete a customer (HTTP 204). e-conomic refuses it while the customer has booked documents.",
  idempotent: false,
  params: [{ key: "customerNumber", label: "Customer number", type: "number", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],
  async execute(input, ctx) {
    await new EconomicClient(ctx).request("DELETE", `/customers/${seg(input.customerNumber)}`);
    return { deleted: true };
  },
};

export default customerDelete;
