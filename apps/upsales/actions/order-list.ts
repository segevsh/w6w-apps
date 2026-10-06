import type { ActionDefinition } from "@w6w/types";
import { filterQuery, UpsalesClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * `GET /api/v2/orders` — List orders and opportunities. Both live on /orders and differ only by probability.
 *
 * Pages with `limit`/`offset` and accepts Upsales filters via `filter`.
 *
 * Orders and opportunities are the same object: the vendor's examples list opportunities with
 * `probability=gte:1&probability=lte:99` and orders with `probability=100`. `kind` sets that
 * for you. A repeated `probability` key cannot be expressed in the `filter` object.
 */
interface Input {
  limit?: number;
  offset?: number;
  sort?: string;
  filter?: unknown;
  kind?: string;
}

/** Map `kind` to the probability filters the vendor's own examples use. */
function kindFilter(kind?: string): Record<string, string | string[]> {
  if (kind === "opportunity") return { probability: ["gte:1", "lte:99"] };
  if (kind === "order") return { probability: "100" };
  return {};
}

const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "search",
  resource: "order",
  title: "List Orders and Opportunities",
  description:
    "List orders and opportunities. Both live on /orders and differ only by probability.",
  params: [
    ...listParams,
    {
      "key": "kind",
      "label": "Kind",
      "type": "select",
      "options": [
        {
          "value": "opportunity",
          "label": "Opportunities (probability 1-99)",
        },
        {
          "value": "order",
          "label": "Orders (probability 100)",
        },
        {
          "value": "all",
          "label": "All",
        },
      ],
      "default": "all",
    },
  ],
  output: listOutput,

  execute(input, ctx) {
    return new UpsalesClient(ctx).list("/orders", {
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
      ...filterQuery(input.filter),
      ...kindFilter(input.kind),
    });
  },
};

export default orderList;
