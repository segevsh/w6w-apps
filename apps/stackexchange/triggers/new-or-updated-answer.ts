import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/user-answer-list.ts";

export default pollFromListAction<{ site?: string; userIds: string }>({
  key: "new-or-updated-answer",
  title: "New or Updated Answer",
  description:
    "The run gets each answer by the selected users that is new or has new activity (an edit, comment or vote-change stamp moves last_activity_date).",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    site: params.site ?? "stackoverflow",
    userIds: params.userIds,
    page: 1,
    pageSize: 100,
    sort: "activity",
    order: "desc",
  }),
  params: (action.params ?? []).filter((p) => p.key === "site" || p.key === "userIds"),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const a = item as { answer_id?: unknown; last_activity_date?: unknown };
    return `${a.answer_id ?? ""}:${a.last_activity_date ?? ""}`;
  },
  output: [
    { key: "answer_id", type: "number", label: "Answer ID" },
    { key: "question_id", type: "number", label: "Question ID" },
    { key: "creation_date", type: "number", label: "Created (unix seconds)" },
    { key: "last_activity_date", type: "number", label: "Last activity (unix seconds)" },
    { key: "score", type: "number", label: "Score" },
  ],
  sample: {
    answer_id: 101,
    question_id: 55,
    creation_date: 1762646400,
    last_activity_date: 1762732800,
    score: 3,
  },
  maxPages: 1,
});
