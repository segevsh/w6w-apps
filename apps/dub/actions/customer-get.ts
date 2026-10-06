import type { ActionDefinition } from "@w6w/types";
import { DubClient, seg } from "../lib/client.ts";
import { CUSTOMER_OUTPUT } from "../lib/customers.ts";

interface Input {
  customerId: string;
  includeExpandedFields?: boolean;
}

/** `GET /customers/{id}`. */
const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Retrieve one customer by Dub ID, or by your own external ID prefixed with `ext_`.",
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      hint: "The Dub customer ID, or `ext_` followed by your external ID.",
    },
    { key: "includeExpandedFields", label: "Include link, partner and discount", type: "boolean" },
  ],
  output: CUSTOMER_OUTPUT,

  execute(input, ctx) {
    return new DubClient(ctx).request("GET", `/customers/${seg(input.customerId)}`, {
      query: { includeExpandedFields: input.includeExpandedFields },
    });
  },
};

export default customerGet;
