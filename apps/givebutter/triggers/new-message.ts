import type { TriggerDefinition } from "@w6w/types";
import messageList from "../actions/message-list.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * Outbound messages are the sent emails and texts of one account, a small bounded set, and GET /messages has no sort or since filter.
 * Every check reads all pages through `message-list` and diffs the ids (`pollSnapshot`, added
 * only). https://docs.givebutter.com/api-reference/messages/list-all-messages (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-message",
  title: "New Message",
  description:
    "The run gets each outbound email or text message newly created on your Givebutter account.",
  output: [
    { key: "id", type: "number", label: "Message ID" },
    { key: "channel", type: "string", label: "Channel" },
    { key: "status", type: "string", label: "Status" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 9001,
    channel: "email",
    status: "sent",
    subject: "Thank you",
    created_at: "2026-11-09T10:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({ state, items: await readAllPages(messageList, {}, ctx) });
  },
};

export default trigger;
