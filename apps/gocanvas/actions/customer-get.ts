import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  customerId: number;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer by id.",
  params: [
    idParam("customerId", "Customer ID"),
  ],
  output: [
    { key: "data", type: "object", label: "The customer" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/customers/${encodeId(input.customerId)}`);
  },
};

export default customerGet;
