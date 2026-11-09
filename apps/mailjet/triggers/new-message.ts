import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listMessages, { type MailjetMessageRecord } from "../actions/list-messages.ts";

const newMessage = pollFromListAction({
  key: "new-message",
  title: "New Message",
  description: "Poll Mailjet's message log for newly sent messages.",
  action: listMessages,
  input: () => ({ limit: 100, sort: "ArrivedAt DESC" }),
  items: (result) => (result as { Data?: MailjetMessageRecord[] }).Data ?? [],
  idOf: (item) => {
    const message = item as MailjetMessageRecord;
    return message.UUID ?? String(message.ID);
  },
  output: [
    { key: "ID", type: "number", label: "Message ID" },
    { key: "UUID", type: "string", label: "Message UUID" },
    { key: "ArrivedAt", type: "string", label: "Arrived At" },
    { key: "Status", type: "string", label: "Status" },
  ],
  sample: { ID: 42, UUID: "8d2f0c21", ArrivedAt: "2026-11-09T12:00:00Z", Status: "sent" },
});

export default newMessage;
