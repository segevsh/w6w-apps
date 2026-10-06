import type { ActionDefinition } from "@w6w/types";
import { RocketChatClient } from "../lib/client.ts";

interface Input {
  messageId: string;
  unpin?: boolean;
}

const pinMessage: ActionDefinition<Input> = {
  key: "pin-message",
  type: "perform",
  resource: "message",
  title: "Pin or Unpin Message",
  description:
    "Pin a message (`POST /chat.pinMessage`), or unpin it (`POST /chat.unPinMessage`) with " +
    "`unpin`. Needs the `pin-message` permission.",
  idempotent: true,
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    { key: "unpin", label: "Unpin instead", type: "boolean", default: false },
  ],
  output: [
    { key: "success", type: "boolean", label: "Succeeded" },
    { key: "message", type: "object", label: "The pinned message (pin only)" },
  ],

  execute(input, ctx) {
    return new RocketChatClient(ctx).request(
      input.unpin ? "/chat.unPinMessage" : "/chat.pinMessage",
      { method: "POST", body: { messageId: input.messageId } },
    );
  },
};

export default pinMessage;
