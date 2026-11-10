import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import threadList from "../actions/thread-list.ts";

export default pollFromListAction({
  key: "new-or-updated-thread",
  title: "New or Updated Thread",
  description:
    "The run gets a thread in the Twist channel you choose each time it is created or gets new activity (a reply or an edit).",
  action: threadList as unknown as ActionDefinition,
  // No before_id/after_id: Twist then orders threads by last_updated, newest activity first.
  input: (params: { channelId?: number }) => ({
    channelId: params.channelId,
    limit: 100,
    orderBy: "desc",
  }),
  params: [threadList.params![0]],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const thread = item as { id?: unknown; last_updated_ts?: unknown };
    return `${String(thread.id ?? "")}:${String(thread.last_updated_ts ?? "")}`;
  },
  output: [
    { key: "id", type: "number", label: "Thread ID" },
    { key: "last_updated_ts", type: "number", label: "Last updated (Unix time)" },
  ],
  sample: { id: 101, title: "Release checklist", last_updated_ts: 1494500713 },
});
