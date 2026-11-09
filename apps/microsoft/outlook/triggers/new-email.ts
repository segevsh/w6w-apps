import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listMessages from "../actions/list-messages.ts";

interface Params {
  folderId?: string;
  search?: string;
}

export default pollFromListAction<Params>({
  key: "new-email",
  title: "New Email",
  description: "Fires for messages newly received in a mailbox or selected mail folder.",
  action: listMessages,
  input: ({ folderId, search }) => ({
    folderId,
    search,
    // Graph rejects `$orderby` when `$search` is present; search results use
    // Graph's sent-date order instead.
    orderby: search ? undefined : "receivedDateTime desc",
    top: 100,
    all: false,
  }),
  items: (result) => (result as { value?: unknown[] }).value ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [
    {
      key: "folderId",
      label: "Mail folder",
      type: "string",
      hint: "Optional folder id or Graph well-known name such as `inbox`.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Optional Microsoft Graph KQL search expression.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "receivedDateTime", type: "string", label: "Received at" },
  ],
  sample: {
    id: "AAMkAGI2...",
    subject: "Quarterly report",
    receivedDateTime: "2026-11-09T12:00:00Z",
  },
  maxPages: 1,
});
