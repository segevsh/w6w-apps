import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { companyParam, detailedParam, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
  detailed?: boolean;
  requireFutureAvailabilities?: boolean;
}

const itemList: ActionDefinition<Input> = {
  key: "item-list",
  type: "read",
  resource: "item",
  title: "List Items",
  description:
    "List the items (bookable products) of a company. Without Detailed the response is the compact form; set Require future availabilities to drop products with nothing left to book.",
  params: [
    companyParam,
    detailedParam,
    {
      key: "requireFutureAvailabilities",
      label: "Require future availabilities",
      type: "boolean",
      hint: "Only return items that have bookable future availabilities.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Items" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).request(
      `/companies/${seg(input.shortname, "shortname")}/items/`,
      {
        query: {
          detailed: input.detailed,
          require_future_availabilities: input.requireFutureAvailabilities,
        },
      },
    );
  },
};

export default itemList;
