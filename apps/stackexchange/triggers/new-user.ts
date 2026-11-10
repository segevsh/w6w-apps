import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/user-list.ts";

export default pollFromListAction<{ site?: string }>({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly created user on the selected site.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    site: params.site ?? "stackoverflow",
    page: 1,
    pageSize: 100,
    sort: "creation",
    order: "desc",
  }),
  params: (action.params ?? []).filter((param) => param.key === "site"),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { user_id?: unknown }).user_id ?? ""),
  output: [{ key: "user_id", type: "number", label: "User ID" }, {
    key: "creation_date",
    type: "number",
    label: "Created (unix seconds)",
  }],
  sample: { user_id: 101, creation_date: 1762646400 },
  maxPages: 1,
});
