import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import messagesList from "../actions/messages-list.ts";

export default pollFromListAction<{ yourNumber: string; remoteNumber?: string }>({
  key: "new-message",
  title: "New WhatsApp Message",
  description:
    "The run gets each new message on the connected number (optionally one conversation).",
  action: messagesList as unknown as ActionDefinition,
  input: (p) => ({ yourNumber: p.yourNumber, remoteNumber: p.remoteNumber, pageNumber: 0 }),
  items: (result) => (result as { messages?: unknown[] }).messages ?? [],
  idOf: (item) => String((item as { uuid?: unknown }).uuid ?? ""),
  params: [{
    key: "yourNumber",
    label: "Your number",
    type: "string",
    required: true,
    hint: "The number connected to 2Chat.",
  }, {
    key: "remoteNumber",
    label: "Remote number",
    type: "string",
    hint: "Optional. Only the conversation with this number.",
  }],
  output: [
    { key: "uuid", type: "string", label: "Message ID" },
    { key: "timestamp", type: "string", label: "Timestamp" },
    { key: "session_key", type: "string", label: "Session key" },
    { key: "message", type: "object", label: "Message (text, media)" },
    { key: "sent_by", type: "string", label: "Sent by" },
  ],
  sample: {
    uuid: "M123",
    timestamp: "2026-11-09T10:00:00Z",
    session_key: "WA+595981048477",
    message: { text: "Hello" },
    sent_by: "user",
  },
  maxPages: 1,
});
