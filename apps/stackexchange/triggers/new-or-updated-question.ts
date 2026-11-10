import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/question-list.ts";

export default pollFromListAction<{ site?: string }>({
  key: "new-or-updated-question",
  title: "New or Updated Question",
  description: "The run gets each question that is new or has new activity on the selected site.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    site: params.site ?? "stackoverflow",
    page: 1,
    pageSize: 100,
    sort: "activity",
    order: "desc",
  }),
  params: (action.params ?? []).filter((param) => param.key === "site"),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const question = item as { question_id?: unknown; last_activity_date?: unknown };
    return `${question.question_id ?? ""}:${question.last_activity_date ?? ""}`;
  },
  output: [{ key: "question_id", type: "number", label: "Question ID" }, {
    key: "last_activity_date",
    type: "number",
    label: "Last activity (unix seconds)",
  }],
  sample: { question_id: 101, last_activity_date: 1762732800 },
  maxPages: 1,
});
