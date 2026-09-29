import type { ActionDefinition } from "@w6w/types";
import { unset, WebexClient } from "../lib/client.ts";

interface Input {
  messageId: string;
  roomId: string;
  text?: string;
  markdown?: string;
}

const editMessage: ActionDefinition<Input> = {
  key: "edit-message",
  type: "perform",
  resource: "message",
  title: "Edit Message",
  description: "Edit the text of a message this connection's user authored. A full replace, so " +
    "Room ID is required even though it does not change.",
  idempotent: true,
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    { key: "roomId", label: "Room ID", type: "string", required: true },
    { key: "text", label: "Text", type: "text" },
    {
      key: "markdown",
      label: "Markdown",
      type: "text",
      hint: "If set, do not also set Text — Webex requires exactly one.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "updated", type: "string", label: "Updated" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request(`/messages/${encodeURIComponent(input.messageId)}`, {
      method: "PUT",
      body: {
        roomId: input.roomId,
        text: unset(input.text),
        markdown: unset(input.markdown),
      },
    });
  },
};

export default editMessage;
