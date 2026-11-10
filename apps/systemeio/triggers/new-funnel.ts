import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/funnel-list.ts";

// systeme.io pagination guide: "Specify the order of the data using the `order` parameter, with
// options for ascending (`asc`) or descending (`desc`) order." (https://developer.systeme.io/reference/api, verified 2026-11-10).
// Ids only grow, so `order=desc` is newest first; `/api/funnels` takes the same `order`/`limit` pair.
export default pollFromListAction<Record<string, never>>({
  key: "new-funnel",
  title: "New Funnel",
  description: "The run gets each newly created funnel.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100, order: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    {
      "key": "id",
      "type": "number",
      "label": "Funnel ID",
    },
    {
      "key": "name",
      "type": "string",
      "label": "Name",
    },
  ],
  sample: {
    "id": 15,
    "name": "Launch funnel",
  },
  maxPages: 1,
});
