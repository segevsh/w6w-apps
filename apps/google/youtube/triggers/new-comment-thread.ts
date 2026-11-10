import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listCommentThreads from "../actions/list-comment-threads.ts";

export default pollFromListAction<{ part: string; channelId: string }>({
  key: "new-comment-thread",
  title: "New Comment Thread",
  description: "The run gets each newly posted YouTube comment thread.",
  action: listCommentThreads as unknown as ActionDefinition,
  input: (params) => ({
    part: "snippet",
    allThreadsRelatedToChannelId: String(params.channelId ?? ""),
    order: "time",
    maxResults: 100,
  }),
  params: [{ key: "channelId", label: "Channel ID", type: "string", required: true }],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Comment thread ID" }],
  sample: { id: "thread-1" },
  maxPages: 1,
});
