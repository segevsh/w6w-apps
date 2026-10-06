import type { ActionDefinition } from "@w6w/types";
import { ServiceTitanClient } from "../lib/client.ts";

/** `GET /crm/v2/tenant/{tenant}/customers/{id}` — one customer. */
interface Input {
  id: number;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get a Customer",
  description: "Get a single customer by its numeric id.",
  params: [{ key: "id", label: "Customer ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "address", type: "object", label: "Bill-to address" },
    { key: "balance", type: "number", label: "Balance" },
  ],

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request(
      "crm",
      `/customers/${encodeURIComponent(String(input.id))}`,
    );
  },
};

export default customerGet;
