import { pollFromListAction } from "../../_shared/poll/mod.ts";
import messageList from "../actions/message-list.ts";

// GET /messages returns the user's drafts, scheduled and sent messages newest first
// (https://developer.mixmax.com/reference/messages-1), so page 1 is the feed.
export default pollFromListAction({
  key: "new-message",
  title: "New Message",
  description: "The run gets each new Mixmax message (draft, scheduled or sent).",
  action: messageList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [
    { key: "_id", type: "string", label: "Message ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "created", type: "number", label: "Created at (ms)" },
  ],
  sample: { _id: "message-sample-1", subject: "Intro call", created: 1762765200000 },
  maxPages: 1,
});
