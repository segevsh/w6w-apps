import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  messageUid: string;
  reaction: string;
}

const reactionUpdate: ActionDefinition<Input> = {
  key: "reaction-update",
  type: "perform",
  idempotent: true,
  resource: "message",
  title: "Update Message Reaction",
  description: "Set an emoji reaction on a message (PATCH /messages/{message_uid}/reactions).",
  params: [
    {
      "key": "messageUid",
      "label": "Message UID",
      "type": "string",
      "required": true,
      "hint": "From a send action, List Messages, or a webhook payload.",
    },
    {
      "key": "reaction",
      "label": "Reaction",
      "type": "string",
      "required": true,
      "hint": "The emoji, e.g. 👍.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "message_uid" },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).patch(`/messages/${seg(input.messageUid)}/reactions`, {
      reaction: input.reaction,
    });
  },
};

export default reactionUpdate;
