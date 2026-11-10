import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/message-list.ts";

export default pollFromListAction({
  key: "new-message",
  title: "New Email",
  description: "Polls the existing message-list action newest first.",
  action,
  input: () => ({ start: 1, limit: 100, sortBy: "date", sortorder: false }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { messageId?: unknown }).messageId ?? ""),
  output: [{ key: "messageId", type: "string", label: "Message ID" }],
  sample: { messageId: "message-101" },
});
