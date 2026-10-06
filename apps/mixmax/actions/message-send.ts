import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, MixmaxClient, seg } from "../lib/client.ts";

interface Input {
  messageId: string;
  data?: unknown;
  options?: unknown;
}

const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send a previously created draft message, optionally updating its properties first.",
  idempotent: false,
  params: [
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      required: true,
      hint: "The `_id` of the draft to send.",
    },
    {
      key: "data",
      label: "Updates",
      type: "json",
      hint: "Optional message properties (same as Create Draft Message) applied before sending.",
    },
    { key: "options", label: "Options", type: "json", hint: "Optional sending options." },
  ],
  output: [{ key: "sent", type: "boolean", label: "Sent" }, {
    key: "result",
    type: "object",
    label: "Response",
  }],

  async execute(input, ctx) {
    const result = await new MixmaxClient(ctx).request(
      "POST",
      `/messages/${seg(input.messageId)}/send`,
      {
        body: compact({ data: jsonValue(input.data), options: jsonValue(input.options) }),
      },
    );
    return { sent: true, result };
  },
};

export default messageSend;
