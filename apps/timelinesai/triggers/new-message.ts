import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import messagesList from "../actions/messages-list.ts";

export default pollFromListAction({
  key: "new-message",
  title: "New Message",
  description: "Poll newest messages in a selected chat through messages-list.",
  action: messagesList as unknown as ActionDefinition,
  input: (params: { chatId?: number }) => ({ chatId: params.chatId, sortingOrder: "desc" }),
  params: [messagesList.params![0]],
  items: (result) => {
    const data = (result as { data?: { messages?: unknown[] } }).data;
    return data?.messages ?? [];
  },
  idOf: (item) => String((item as { uid?: unknown }).uid ?? ""),
  output: [{ key: "uid", type: "string", label: "Message UID" }],
  sample: { uid: "sample-message", text: "Hello" },
  maxPages: 1,
});
