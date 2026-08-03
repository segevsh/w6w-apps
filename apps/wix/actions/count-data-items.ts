import type { ActionDefinition } from "@w6w/types";
import { compact, WixClient } from "../lib/client.ts";

interface Input {
  dataCollectionId: string;
  filter?: Record<string, unknown>;
  consistentRead?: boolean;
}

/** `POST /wix-data/v2/items/count` — handler `wix.data.v2.data_item:CountDataItems`. */
const countDataItems: ActionDefinition<Input> = {
  key: "count-data-items",
  type: "read",
  resource: "data-item",
  title: "Count Data Items",
  description:
    "Count the items in a CMS collection matching a filter, without transferring them. Cheaper than a query when only the number matters.",
  params: [
    { key: "dataCollectionId", label: "Collection ID", type: "string", required: true },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint: "Same Wix API Query Language filter as Query Data Items. Omit to count everything.",
    },
    { key: "consistentRead", label: "Consistent read", type: "boolean" },
  ],
  output: [{ key: "totalCount", type: "number", label: "Matching item count" }],

  execute(input, ctx) {
    return new WixClient(ctx).request("/wix-data/v2/items/count", {
      method: "POST",
      body: compact({
        dataCollectionId: input.dataCollectionId,
        filter: input.filter,
        consistentRead: input.consistentRead,
      }),
    });
  },
};

export default countDataItems;
