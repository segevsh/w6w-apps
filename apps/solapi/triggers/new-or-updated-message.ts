import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listMessages from "../actions/list-messages.ts";

export default pollFromListAction({
  key: "new-or-updated-message",
  title: "New or Updated Message",
  description: "The run gets each newly created or updated SOLAPI message.",
  action: listMessages,
  input: () => ({ dateType: "UPDATED", limit: 200 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const row = item as { messageId?: unknown; dateUpdated?: unknown; updatedAt?: unknown };
    return `${String(row.messageId ?? "")}:${String(row.dateUpdated ?? row.updatedAt ?? "")}`;
  },
  output: [{ key: "messageId", type: "string", label: "Message ID" }],
  sample: { messageId: "message-101", dateUpdated: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
