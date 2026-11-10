import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import inboxList from "../actions/inbox-list.ts";

export default pollFromListAction({
  key: "new-or-updated-inbox-thread",
  title: "New or Updated Inbox Thread",
  description:
    "The run gets a thread in your Twist inbox for the workspace you choose each time it arrives or gets new activity, across all channels.",
  action: inboxList as unknown as ActionDefinition,
  // Twist: the inbox order "is applied based on the last_updated attribute".
  input: (params: { workspaceId?: number }) => ({
    workspaceId: params.workspaceId,
    limit: 100,
    orderBy: "desc",
  }),
  params: [inboxList.params![0]],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const thread = item as { id?: unknown; last_updated_ts?: unknown };
    return `${String(thread.id ?? "")}:${String(thread.last_updated_ts ?? "")}`;
  },
  output: [
    { key: "id", type: "number", label: "Thread ID" },
    { key: "channel_id", type: "number", label: "Channel ID" },
    { key: "last_updated_ts", type: "number", label: "Last updated (Unix time)" },
  ],
  sample: { id: 101, channel_id: 7, title: "Release checklist", last_updated_ts: 1494500713 },
});
