import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listMessages from "../actions/list-messages.ts";

export default pollFromListAction({
  key: "new-message",
  title: "New Message",
  description: "The run gets each newly created SOLAPI message.",
  action: listMessages,
  input: () => ({ dateType: "CREATED", limit: 200 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) =>
    String(
      (item as { messageId?: unknown; id?: unknown }).messageId ?? (item as { id?: unknown }).id ??
        "",
    ),
  output: [{ key: "messageId", type: "string", label: "Message ID" }],
  sample: { messageId: "message-101", dateCreated: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
