import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/item-search.ts";

export default pollFromListAction({
  key: "new-listing",
  title: "New Listing",
  description: "The run gets each newly listed eBay item matching the search.",
  action,
  input: (params) => ({ ...params, sort: "newlyListed", limit: 100, offset: 0 }),
  items: (result) => (result as { itemSummaries?: unknown[] }).itemSummaries ?? [],
  idOf: (item) => String((item as { itemId: string }).itemId),
  params: action.params,
  output: [{ key: "itemId", type: "string", label: "Item ID" }],
  sample: {
    itemId: "v1|123|0",
    title: "Example listing",
    itemCreationDate: "2026-11-09T00:00:00Z",
  },
  maxPages: 1,
});
