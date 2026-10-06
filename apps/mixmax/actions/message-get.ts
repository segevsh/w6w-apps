import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, seg } from "../lib/client.ts";

interface Input {
  messageId: string;
}

const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description:
    "Fetch one message by id: sender, recipients, subject, tracking flags and sent/scheduled times.",
  params: [
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      required: true,
      hint: "The `_id` of the message.",
    },
  ],
  output: [{ key: "message", type: "object", label: "Message" }],

  async execute(input, ctx) {
    const message = await new MixmaxClient(ctx).request("GET", `/messages/${seg(input.messageId)}`);
    return { message };
  },
};

export default messageGet;
