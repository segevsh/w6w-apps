import type { ActionDefinition } from "@w6w/types";
import { UscreenClient } from "../lib/client.ts";
import { PAGE, rangeParams } from "../lib/params.ts";

interface Input {
  from?: string;
  to?: string;
  page?: number;
}

const offerList: ActionDefinition<Input> = {
  key: "offer-list",
  type: "search",
  resource: "offer",
  title: "List Offers",
  description: "List the store's offers (subscription plans, rentals, one-off purchases).",
  params: [
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
    return new UscreenClient(ctx).list("/offers", {
      "from": input.from,
      "to": input.to,
      "page": input.page,
    });
  },
};

export default offerList;
