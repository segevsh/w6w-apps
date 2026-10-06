import type { ActionDefinition } from "@w6w/types";
import { payload, seg, ZulipClient } from "../lib/client.ts";

interface Input {
  message_id: number;
}

const deleteMessage: ActionDefinition<Input> = {
  key: "delete-message",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  idempotent: true,
  description:
    "Permanently delete a message (DELETE /messages/{message_id}). Needs the organization's message-deletion permission.",
  params: [
    {
      "key": "message_id",
      "label": "Message ID",
      "type": "number",
      "required": true,
    },
  ],
  output: [],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request("DELETE", `/messages/${seg(input.message_id)}`);
    return payload(res);
  },
};

export default deleteMessage;
