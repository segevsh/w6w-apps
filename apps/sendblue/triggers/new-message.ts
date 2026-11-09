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
  idOf: (item) => String((item as { id: string }).id),
  params: messageList.params,
  output: [{ key: "id", type: "string", label: "Message ID" }],
  sample: { id: "msg_123", content: "Hello" },
  maxPages: 1,
});
