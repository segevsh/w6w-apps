import messageList from "../actions/message-list.ts";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

export default pollFromListAction({
  key: "new-message",
  title: "New Message",
  description: "The run gets each new WebinarGeek chat message.",
  action: messageList,
  input: () => ({ order: "created_at", sort: "desc", page: 1, perPage: 100 }),
  items: (result) => (result as { messages?: unknown[] }).messages ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "number", label: "Message ID" }],
  sample: { id: 1, message: "Hello" },
  maxPages: 1,
});
