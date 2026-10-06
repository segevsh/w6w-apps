import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  messageUid: string;
}

const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Get one message by UID (GET /messages/{message_uid}).",
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
      type: "object",
      label:
        "The message: uid, chat_id, from_me, text, status, message_type, reactions, failure_reason \u2026",
    },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).get(`/messages/${seg(input.messageUid)}`);
  },
};

export default messageGet;
