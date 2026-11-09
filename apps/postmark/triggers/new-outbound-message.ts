import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listOutboundMessages from "../actions/list-outbound-messages.ts";

interface OutboundMessage {
  MessageID?: string;
  ReceivedAt?: string;
  Subject?: string;
  Status?: string;
}

const newOutboundMessage = pollFromListAction({
  key: "new-outbound-message",
  title: "New Outbound Message",
  description: "Poll Postmark's newest-first outbound message search for newly sent messages.",
  action: listOutboundMessages,
  input: () => ({ count: 100, offset: 0 }),
  items: (result) => (result as { Messages?: OutboundMessage[] }).Messages ?? [],
  idOf: (item) => String((item as OutboundMessage).MessageID),
  output: [
    { key: "MessageID", type: "string", label: "Message ID" },
    { key: "ReceivedAt", type: "string", label: "Sent At" },
    { key: "Subject", type: "string", label: "Subject" },
    { key: "Status", type: "string", label: "Status" },
  ],
  sample: {
    MessageID: "7e2af7c8-9d31-4c52-891f-5ce23329a148",
    ReceivedAt: "2026-11-09T12:00:00Z",
    Subject: "Order received",
    Status: "Sent",
  },
});

export default newOutboundMessage;
