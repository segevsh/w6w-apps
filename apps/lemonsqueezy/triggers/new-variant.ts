import type { ActionDefinition } from "@w6w/types";
import action from "../actions/variant-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /v1/variants` lists variant objects ordered by `sort`, not by creation
 * (https://docs.lemonsqueezy.com/api/variants/list-all-variants, verified 2026-11-10), so a newest-first
 * window does not exist. The collection is small and bounded (a store's own catalogue), so each
 * check reads it whole (`page[size]=100`, at most 10 pages) and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-variant",
  title: "New Variant",
  description:
    "The run gets each variant that appears in the account, found by diffing the whole `variant-list` listing between checks.",
  action: action as unknown as ActionDefinition,
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Variant ID",
    },
    {
      "key": "attributes",
      "type": "object",
      "label": "Variant attributes",
    },
  ],
  sample: {
    "id": "1",
    "type": "variants",
    "attributes": {
      "name": "Default",
      "product_id": 1,
      "status": "published",
      "created_at": "2026-11-09T10:00:00.000000Z",
    },
  },
});
