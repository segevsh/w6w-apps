import type { ActionDefinition } from "@w6w/types";
import { compact, seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  chatId: number;
  text?: string;
  fileUid?: string;
  attachmentTemplateId?: number;
  label?: string;
  replyTo?: string;
}

const messageSendToChat: ActionDefinition<Input> = {
  key: "message-send-to-chat",
  type: "perform",
  idempotent: false,
  resource: "message",
  title: "Send Message to Chat",
  description:
    "Send a message into an existing chat or group by its chat id (POST /chats/{chat_id}/messages). A text-and-file message costs 2 message credits.",
  params: [
    {
      "key": "chatId",
      "label": "Chat ID",
      "type": "number",
      "required": true,
      "hint":
        "The numeric chat id — from List Chats, the chat's URL in TimelinesAI, or a webhook payload.",
    },
    {
      "key": "text",
      "label": "Text",
      "type": "text",
      "hint": "Plain text, up to 2000 characters. Use \\n for line breaks.",
      "validation": {
        "maxLength": 2000,
      },
    },
    {
      "key": "fileUid",
      "label": "File UID",
      "type": "string",
      "hint":
        "An uploaded file's uid (Upload File from URL / List Files). Text plus a file costs 2 message credits.",
    },
    {
      "key": "attachmentTemplateId",
      "label": "Attachment template ID",
      "type": "number",
      "hint": "A workspace attachment template id; the template must already exist.",
    },
    {
      "key": "label",
      "label": "Label",
      "type": "string",
      "hint": "Label name (max 64 chars) to apply to the chat; created if it does not exist.",
      "validation": {
        "maxLength": 64,
      },
    },
    {
      "key": "replyTo",
      "label": "Reply to message UID",
      "type": "string",
      "hint": "UID of a message in the same workspace and WhatsApp account to reply to.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "message_uid of the queued message" },
  ],

  execute(input, ctx) {
    if (!input.text && !input.fileUid && !input.attachmentTemplateId) {
      throw new Error("provide `text`, `fileUid` or `attachmentTemplateId`");
    }
    return new TimelinesClient(ctx).post(
      `/chats/${seg(input.chatId)}/messages`,
      compact({
        text: input.text,
        file_uid: input.fileUid,
        label: input.label,
        attachment_template_id: input.attachmentTemplateId,
        reply_to: input.replyTo,
      }),
    );
  },
};

export default messageSendToChat;
