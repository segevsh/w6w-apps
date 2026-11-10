import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/enrollment-list.ts";

// systeme.io pagination guide: "Specify the order of the data using the `order` parameter, with
// options for ascending (`asc`) or descending (`desc`) order." (https://developer.systeme.io/reference/api, verified 2026-11-10).
// Ids only grow, so `order=desc` is newest first; `/api/school/enrollments` takes the same `order`/`limit` pair.
export default pollFromListAction<Record<string, never>>({
  key: "new-enrollment",
  title: "New Enrollment",
  description: "The run gets each newly created course enrollment.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100, order: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    {
      "key": "id",
      "type": "number",
      "label": "Enrollment ID",
    },
  ],
  sample: {
    "id": 14,
  },
  maxPages: 1,
});
