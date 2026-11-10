import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/community-list.ts";

// systeme.io pagination guide: "Specify the order of the data using the `order` parameter, with
// options for ascending (`asc`) or descending (`desc`) order." (https://developer.systeme.io/reference/api, verified 2026-11-10).
// Ids only grow, so `order=desc` is newest first; `/api/community/communities` takes the same `order`/`limit` pair.
export default pollFromListAction<Record<string, never>>({
  key: "new-community",
  title: "New Community",
  description: "The run gets each newly created community.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100, order: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    {
      "key": "id",
      "type": "number",
      "label": "Community ID",
    },
    {
      "key": "name",
      "type": "string",
      "label": "Name",
    },
  ],
  sample: {
    "id": 12,
    "name": "Members",
  },
  maxPages: 1,
});
