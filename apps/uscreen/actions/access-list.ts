import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";
import { CUSTOMER_ID, PAGE, rangeParams } from "../lib/params.ts";

interface Input {
  customerId: string;
  from?: string;
  to?: string;
  page?: number;
}

const accessList: ActionDefinition<Input> = {
  key: "access-list",
  type: "search",
  resource: "access",
  title: "List Customer Accesses",
  description:
    "List the products (bundles, subscriptions, rentals, freebies) a customer has access to.",
  params: [
    CUSTOMER_ID(""),
    ...rangeParams(),
    PAGE,
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "totalCount", type: "number", label: "Total-Count header (null when absent)" },
    {
      key: "totalCountCapped",
      type: "boolean",
      label: "True when the total was reported as 10000+",
    },
    { key: "page", type: "number", label: "Page returned" },
    { key: "nextPage", type: "number", label: "Next page number, or null on the last page" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  execute(input, ctx) {
    return new UscreenClient(ctx).list(`/customers/${seg(input.customerId)}/accesses`, {
      "from": input.from,
      "to": input.to,
      "page": input.page,
    });
  },
};

export default accessList;
