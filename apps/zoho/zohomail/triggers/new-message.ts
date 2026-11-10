import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/message-list.ts";

export default pollFromListAction({
  key: "new-message",
  title: "New Email",
  description: "The run gets each new email in the mailbox (or one folder), newest first.",
  action,
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      hint: "Leave empty to use the mailbox recorded on the connection.",
    },
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      hint:
        "Only watch this folder (use Get Folders for the id, e.g. the Inbox). Empty watches every folder.",
    },
  ],
  input: (params: { accountId?: string; folderId?: string }) => ({
    accountId: params.accountId,
    folderId: params.folderId,
    start: 1,
    limit: 100,
    sortBy: "date",
    sortorder: false,
  }),
  items: (result) => (Array.isArray(result) ? result : []),
  idOf: (item) => String((item as { messageId?: unknown }).messageId ?? ""),
  output: [
    { key: "messageId", type: "string", label: "Message ID" },
    { key: "folderId", type: "string", label: "Folder ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "sender", type: "string", label: "Sender display name" },
    { key: "fromAddress", type: "string", label: "From address" },
    { key: "summary", type: "string", label: "Summary" },
    { key: "receivedTime", type: "string", label: "Received time (epoch ms)" },
    { key: "threadId", type: "string", label: "Thread ID" },
  ],
  sample: {
    messageId: "1731153600000100001",
    folderId: "2560636000000008014",
    subject: "Quarterly report",
    sender: "Ada",
    fromAddress: "ada@example.com",
    summary: "Please find the report attached.",
    receivedTime: "1731153600000",
    threadId: "1731153600000100001",
  },
});
