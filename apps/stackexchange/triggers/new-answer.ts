import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/user-answer-list.ts";

export default pollFromListAction<{ site?: string; userIds: string }>({
  key: "new-answer",
  title: "New Answer",
  description: "The run gets each newly created answer for the selected users.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    site: params.site ?? "stackoverflow",
    userIds: params.userIds,
    page: 1,
    pageSize: 100,
    sort: "creation",
    order: "desc",
  }),
  params: (action.params ?? []).filter((p) => p.key === "site" || p.key === "userIds"),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { answer_id?: unknown }).answer_id ?? ""),
  output: [{ key: "answer_id", type: "number", label: "Answer ID" }],
  sample: { answer_id: 101, creation_date: 1762646400 },
  maxPages: 1,
});
