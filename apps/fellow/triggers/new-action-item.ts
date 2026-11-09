import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/action-item-list.ts";

export default pollFromListAction({
  key: "new-action-item",
  title: "New Action Item",
  description: "The run gets each newly created Fellow action item.",
  action,
  input: (params) => ({ ...params, pageSize: 50, orderBy: "created_at_desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: string }).id),
  params: action.params,
  output: [{ key: "id", type: "string", label: "Action item ID" }],
  sample: { id: "action_123", created_at: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
