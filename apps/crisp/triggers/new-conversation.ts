import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listConversations from "../actions/list-conversations.ts";

export default pollFromListAction({
  key: "new-conversation",
  title: "New Conversation",
  description: "The run gets each newly created conversation.",
  action: listConversations as never,
  input: () => ({ pageNumber: 1, perPage: 50 }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { session_id?: unknown }).session_id ?? ""),
  output: [{ key: "session_id", type: "string", label: "Conversation ID" }],
  sample: { session_id: "session-1" },
  maxPages: 1,
});
