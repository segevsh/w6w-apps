import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/comment-get-many.ts";

const trigger = pollFromListAction({
  key: "new-comment",
  title: "New Comment",
  description: "The run gets each newly created Jira issue comment.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ ...params, orderBy: "-created", maxResults: 100, startAt: 0 }),
  items: (result) => (result as { comments?: unknown[] }).comments ?? [],
  idOf: (item) => String((item as { id?: string | number }).id),
  params: action.params,
  output: [{ key: "id", type: "string", label: "Comment ID" }],
  sample: { id: "10001", body: "A newly added comment." },
  maxPages: 1,
});

export default trigger;
