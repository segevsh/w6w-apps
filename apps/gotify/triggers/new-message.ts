import { pollFromListAction } from "../../_shared/poll/mod.ts";
import messageList from "../actions/message-list.ts";

export default pollFromListAction({
  key: "new-message",
  title: "New Message",
  description: "The run gets each newly received Gotify message.",
  action: messageList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { messages?: unknown[] }).messages ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Message ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
