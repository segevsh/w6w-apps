import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

const deleteMessage: ActionDefinition<Input> = {
  key: "delete-message",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  description: "Delete a message this connection's user authored.",
  idempotent: true,
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new WebexClient(ctx).request(`/messages/${encodeURIComponent(input.messageId)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default deleteMessage;
