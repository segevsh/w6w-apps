import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/chat-list.ts";

export default pollFromListAction({
  key: "new-chat",
  title: "New Chat",
  description: "Polls the existing chat-list action using its most-recently-modified feed.",
  action,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { chats?: unknown[] }).chats ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; chat_id?: unknown }).id ?? (item as { chat_id?: unknown }).chat_id ??
        "",
    ),
  output: [{ key: "id", type: "string", label: "Chat ID" }],
  sample: { id: "chat-101" },
});
