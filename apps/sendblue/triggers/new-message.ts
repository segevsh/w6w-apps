import { pollFromListAction } from "../../_shared/poll/mod.ts";
import messageList from "../actions/message-list.ts";

export default pollFromListAction({
  key: "new-message",
  title: "New Message",
  description: "Polls the newest Sendblue messages from message-list.",
  action: messageList,
  input: (params) => ({
    ...params,
    orderBy: "createdAt",
    orderDirection: "desc",
    limit: 100,
    offset: 0,
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { message_handle: string }).message_handle),
  params: messageList.params,
  output: [
    { key: "message_handle", type: "string", label: "Message handle" },
    { key: "content", type: "string", label: "Message text" },
    { key: "from_number", type: "string", label: "From number" },
    { key: "to_number", type: "string", label: "To number" },
    { key: "is_outbound", type: "boolean", label: "Sent by you" },
    { key: "service", type: "string", label: "iMessage, SMS or RCS" },
    { key: "status", type: "string", label: "Delivery status" },
  ],
  sample: {
    message_handle: "msg_123",
    content: "Hello",
    from_number: "+14155550100",
    to_number: "+14155550101",
    is_outbound: false,
    service: "iMessage",
    status: "RECEIVED",
  },
  maxPages: 1,
});
