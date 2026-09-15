import type { ActionDefinition } from "@w6w/types";
import { TremendousClient } from "../lib/client.ts";

/**
 * `GET /funding_sources` — every way this organization can pay for orders
 * (balance, bank account, credit card, invoice), plus each one's status and
 * `usage_permissions`. `list-funding-sources` takes no parameters.
 *
 * Note the vendor's own caution: `available_amount` on a `balance` or
 * `invoice` source here is CACHED and may be stale — use `funding-source-get`
 * (`GET /funding_sources/{id}`) for the current figure right before an order
 * that depends on it.
 */
type Input = Record<string, never>;

const fundingSourceList: ActionDefinition<Input> = {
  key: "funding-source-list",
  type: "search",
  resource: "funding-source",
  title: "List Funding Sources",
  description: "List the funding sources available to pay for orders.",
  params: [],
  output: [{ key: "funding_sources", type: "array", label: "Funding sources" }],

  execute(_input, ctx) {
    return new TremendousClient(ctx).json("/funding_sources");
  },
};

export default fundingSourceList;
