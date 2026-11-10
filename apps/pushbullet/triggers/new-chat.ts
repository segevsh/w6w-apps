import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/chat-list.ts";

export default pollFromListAction({
  key: "new-chat",
  title: "New Chat",
  description: "The run gets each newly created chat.",
  action,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { chats?: unknown[] }).chats ?? [],
  idOf: (item) => String((item as { iden?: unknown }).iden ?? ""),
  output: [{ key: "iden", type: "string", label: "Chat ID" }],
  sample: { iden: "chat-1" },
  maxPages: 1,
});
