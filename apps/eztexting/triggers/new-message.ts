import { pollFromListAction } from "../../_shared/poll/mod.ts";
import messageList from "../actions/message-list.ts";

// Newest first: `sort=sentAt,desc` (https://developers.eztexting.com/reference/list_6-1); the page is the
// vendor's 100-row size, one request per check.
export default pollFromListAction({
  key: "new-message",
  title: "New Message",
  description: "The run gets each text message sent or received on the account (newest first).",
  action: messageList,
  input: () => ({ page: 0, size: "100", sort: "sentAt,desc" }),
  items: (result) =>
    Array.isArray((result as { content?: unknown[] }).content)
      ? (result as { content: unknown[] }).content
      : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "userNumber", type: "string", label: "Your sending number" },
    { key: "contactNumber", type: "string", label: "Contact phone number" },
    { key: "inbound", type: "boolean", label: "True for a received message" },
    { key: "message", type: "string", label: "Message text" },
    { key: "sentAt", type: "string", label: "Sent at" },
    { key: "type", type: "string", label: "SMS or MMS" },
  ],
  sample: {
    id: "msg-1001",
    userNumber: "5550100200",
    contactNumber: "5550100300",
    inbound: true,
    message: "Hello",
    sentAt: "2026-11-09T12:00:00Z",
    type: "SMS",
  },
  maxPages: 1,
});
