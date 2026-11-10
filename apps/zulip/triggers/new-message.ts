import { pollFromListAction } from "../../_shared/poll/mod.ts";
import getMessages from "../actions/get-messages.ts";

export default pollFromListAction({
  key: "new-message",
  title: "New Message",
  description: "The run gets each new Zulip message visible to the connection.",
  action: getMessages,
  input: () => ({ anchor: "newest", num_before: 100, num_after: 0, apply_markdown: false }),
  items: (result) => (result as { messages?: unknown[] }).messages ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Message ID" }],
  sample: { id: 101, content: "Hello" },
  maxPages: 1,
});
