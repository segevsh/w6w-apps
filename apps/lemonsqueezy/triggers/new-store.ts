import type { ActionDefinition } from "@w6w/types";
import action from "../actions/store-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /v1/stores` lists store objects ordered by `name`, not by creation
 * (https://docs.lemonsqueezy.com/api/stores/list-all-stores, verified 2026-11-10), so a newest-first
 * window does not exist. The collection is small and bounded (a store's own catalogue), so each
 * check reads it whole (`page[size]=100`, at most 10 pages) and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-store",
  title: "New Store",
  description:
    "The run gets each store that appears in the account, found by diffing the whole `store-list` listing between checks.",
  action: action as unknown as ActionDefinition,
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Store ID",
    },
    {
      "key": "attributes",
      "type": "object",
      "label": "Store attributes",
    },
  ],
  sample: {
    "id": "1",
    "type": "stores",
    "attributes": {
      "name": "Acme",
      "currency": "USD",
      "created_at": "2026-11-09T10:00:00.000000Z",
    },
  },
});
