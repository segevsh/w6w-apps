import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/membership-list.ts";

// systeme.io pagination guide: "Specify the order of the data using the `order` parameter, with
// options for ascending (`asc`) or descending (`desc`) order." (https://developer.systeme.io/reference/api, verified 2026-11-10).
// Ids only grow, so `order=desc` is newest first; `/api/community/memberships` takes the same `order`/`limit` pair.
export default pollFromListAction<Record<string, never>>({
  key: "new-membership",
  title: "New Community Membership",
  description: "The run gets each newly created community membership.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100, order: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    {
      "key": "id",
      "type": "number",
      "label": "Membership ID",
    },
  ],
  sample: {
    "id": 16,
  },
  maxPages: 1,
});
