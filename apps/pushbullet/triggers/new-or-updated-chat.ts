import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/chat-list.ts";

export default pollFromListAction({
  key: "new-or-updated-chat",
  title: "New or Updated Chat",
  description: "The run gets each chat that is new or was modified since the last check.",
  action,
  input: () => ({ active: true, limit: 100 }),
  items: (result) => (result as { chats?: unknown[] }).chats ?? [],
  idOf: (item) => `${(item as { iden?: string }).iden}:${(item as { modified?: number }).modified}`,
  output: [{ key: "iden", type: "string", label: "Chat ID" }, {
    key: "modified",
    type: "number",
    label: "Last modified (unix seconds)",
  }],
  sample: { iden: "chat-1", modified: 1700000000.5 },
  maxPages: 1,
});
