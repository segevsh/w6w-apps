import type { ActionDefinition } from "@w6w/types";
import { unset, WebexClient } from "../lib/client.ts";

interface Input {
  roomId?: string;
  parentId?: string;
  toPersonId?: string;
  toPersonEmail?: string;
  text?: string;
  markdown?: string;
  fileUrl?: string;
  attachments?: unknown;
}

const createMessage: ActionDefinition<Input> = {
  key: "create-message",
  type: "perform",
  resource: "message",
  title: "Post Message",
  description: "Post a message to a room, a thread (via Parent message ID), or a 1:1 with a " +
    "person — set exactly one destination.",
  // Webex mints a new message id per call and takes no request key.
  idempotent: false,
  params: [
    { key: "roomId", label: "Room ID", type: "string" },
    { key: "parentId", label: "Parent message ID", type: "string", hint: "Reply in a thread." },
    { key: "toPersonId", label: "To person ID", type: "string", hint: "Private 1:1 message." },
    { key: "toPersonEmail", label: "To person email", type: "string" },
    { key: "text", label: "Text", type: "text" },
    {
      key: "markdown",
      label: "Markdown",
      type: "text",
      hint: "Max 7439 bytes. If set, Text (if also set) is used only as a fallback preview.",
    },
    {
      key: "fileUrl",
      label: "File URL",
      type: "string",
      advanced: true,
      hint: "Public URL to a binary file. Only one file per message.",
    },
    {
      key: "attachments",
      label: "Attachments (Cards)",
      type: "json",
      advanced: true,
      hint: "Adaptive Card content attachments. Only one card per message.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "roomId", type: "string", label: "Room ID" },
    { key: "created", type: "string", label: "Created" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request("/messages", {
      method: "POST",
      body: {
        roomId: unset(input.roomId),
        parentId: unset(input.parentId),
        toPersonId: unset(input.toPersonId),
        toPersonEmail: unset(input.toPersonEmail),
        text: unset(input.text),
        markdown: unset(input.markdown),
        files: input.fileUrl ? [input.fileUrl] : undefined,
        attachments: input.attachments,
      },
    });
  },
};

export default createMessage;
