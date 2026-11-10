import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/post-list.ts";

const trigger = pollFromListAction({
  key: "new-post",
  title: "New Post",
  description: "The run gets each newly created post in the selected publication.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ ...params, limit: 100, page: 1, orderBy: "created", direction: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: string }).id),
  params: action.params,
  output: [{ key: "id", type: "string", label: "Post ID" }],
  sample: { id: "post_1", title: "A new post" },
  maxPages: 1,
});

export default trigger;
