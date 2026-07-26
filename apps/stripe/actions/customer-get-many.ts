import type { ActionDefinition } from "@w6w/types";
import { StripeClient, unset } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

interface Input {
  email?: string;
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
}

const customerGetMany: ActionDefinition<Input> = {
  key: "customer-get-many",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description:
    "List customers, newest first. Filter by exact email, or use Search for anything else.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Exact match only. Use `customer-search` for partial or multi-field queries.",
    },
    ...listParams,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new StripeClient(ctx).request("/customers", {
      query: {
        email: unset(input.email),
        limit: input.limit,
        starting_after: unset(input.startingAfter),
        ending_before: unset(input.endingBefore),
      },
    });
  },
};

export default customerGetMany;
