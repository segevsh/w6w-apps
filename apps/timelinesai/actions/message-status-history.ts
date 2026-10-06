import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  messageUid: string;
}

const messageStatusHistory: ActionDefinition<Input> = {
  key: "message-status-history",
  type: "read",
  resource: "message",
  title: "Get Message Status History",
  description:
    "A message's delivery history from queued to read, with any failure reason (GET /messages/{message_uid}/status_history).",
  params: [
    {
      "key": "messageUid",
      "label": "Message UID",
      "type": "string",
      "required": true,
      "hint": "From a send action, List Messages, or a webhook payload.",
    },
  ],
  output: [
    {
      key: "data",
      type: "array",
      label: "Entries: status, timestamp, failure_reason{code,title,details}",
    },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).get(`/messages/${seg(input.messageUid)}/status_history`);
  },
};

export default messageStatusHistory;
