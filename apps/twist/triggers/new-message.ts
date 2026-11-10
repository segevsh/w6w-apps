import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import messageList from "../actions/message-list.ts";

export default pollFromListAction({
  key: "new-message",
  title: "New Message",
  description: "Poll newest messages in a selected Twist conversation.",
  action: messageList as unknown as ActionDefinition,
  input: (params: { conversationId?: number }) => ({
    conversationId: params.conversationId,
    limit: 100,
    orderBy: "desc",
  }),
  params: [messageList.params![0]],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Message ID" }],
  sample: { id: 101, content: "Hello" },
  maxPages: 1,
});
