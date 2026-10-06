import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  messageUid: string;
}

const reactionsGet: ActionDefinition<Input> = {
  key: "reactions-get",
  type: "read",
  resource: "message",
  title: "Get Message Reactions",
  description: "The current reactions on a message (GET /messages/{message_uid}/reactions).",
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
      label: "users[]: name, phone, reaction, current; reactions map; total",
    },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).get(`/messages/${seg(input.messageUid)}/reactions`);
  },
};

export default reactionsGet;
