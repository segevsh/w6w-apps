import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/user-list.ts";

export default pollFromListAction<{ site?: string }>({
  key: "new-or-updated-user",
  title: "New or Updated User",
  description: "The run gets each user that is new or has been modified on the selected site.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    site: params.site ?? "stackoverflow",
    page: 1,
    pageSize: 100,
    sort: "modified",
    order: "desc",
  }),
  params: (action.params ?? []).filter((param) => param.key === "site"),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const user = item as { user_id?: unknown; last_modified_date?: unknown };
    return `${user.user_id ?? ""}:${user.last_modified_date ?? ""}`;
  },
  output: [{ key: "user_id", type: "number", label: "User ID" }, {
    key: "last_modified_date",
    type: "number",
    label: "Modified (unix seconds)",
  }],
  sample: { user_id: 101, last_modified_date: 1762732800 },
  maxPages: 1,
});
