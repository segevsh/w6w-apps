import type { ActionDefinition } from "@w6w/types";
import { StripeClient, unset } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

interface Input {
  customerId?: string;
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
}

const chargeGetMany: ActionDefinition<Input> = {
  key: "charge-get-many",
  type: "search",
  resource: "charge",
  title: "List Charges",
  description: "List charges, newest first, optionally scoped to one customer.",
  params: [
    { key: "customerId", label: "Customer ID", type: "string", placeholder: "cus_…" },
    ...listParams,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new StripeClient(ctx).request("/charges", {
      query: {
        customer: unset(input.customerId),
        limit: input.limit,
        starting_after: unset(input.startingAfter),
        ending_before: unset(input.endingBefore),
      },
    });
  },
};

export default chargeGetMany;
