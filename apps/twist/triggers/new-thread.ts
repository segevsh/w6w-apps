import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import threadList from "../actions/thread-list.ts";

export default pollFromListAction({
  key: "new-thread",
  title: "New Thread",
  description: "The run gets each new thread in the Twist channel you choose.",
  action: threadList as unknown as ActionDefinition,
  input: (params: { channelId?: number }) => ({
    channelId: params.channelId,
    limit: 100,
    orderBy: "desc",
  }),
  params: [threadList.params![0]],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Thread ID" }],
  sample: { id: 101, title: "Release checklist" },
});
