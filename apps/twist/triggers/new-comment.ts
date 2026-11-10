import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import commentList from "../actions/comment-list.ts";

export default pollFromListAction({
  key: "new-comment",
  title: "New Comment",
  description: "The run gets each new comment in the Twist thread you choose.",
  action: commentList as unknown as ActionDefinition,
  input: (params: { threadId?: number }) => ({
    threadId: params.threadId,
    limit: 100,
    orderBy: "desc",
  }),
  params: [commentList.params![0]],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Comment ID" }],
  sample: { id: 101, content: "Looks good" },
});
