import { pollFromListAction } from "../../_shared/poll/mod.ts";
import conversationList from "../actions/conversation-list.ts";

export default pollFromListAction({
  key: "new-conversation",
  title: "New Conversation",
  description: "The run gets each newly created Otter conversation.",
  action: conversationList,
  input: () => ({ limit: 20 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "title", type: "string", label: "Title" },
  ],
  sample: { id: "conv-2", title: "New meeting" },
  maxPages: 1,
});
