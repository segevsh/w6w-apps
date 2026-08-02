import type { ActionDefinition } from "@w6w/types";
import { HelpScoutClient } from "../lib/client.ts";
import { customerOutput } from "../lib/params.ts";

interface Input {
  customerId: number;
}

const getCustomer: ActionDefinition<Input> = {
  key: "get-customer",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch a single customer by ID.",
  params: [
    { key: "customerId", label: "Customer ID", type: "number", required: true },
  ],
  output: customerOutput,

  execute(input, ctx) {
    return new HelpScoutClient(ctx).request(`/customers/${input.customerId}`);
  },
};

export default getCustomer;
