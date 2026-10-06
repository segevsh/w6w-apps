import type { ActionDefinition } from "@w6w/types";
import { compact, TimelinesClient } from "../lib/client.ts";

interface Input {
  jid: string;
  whatsappAccountPhone?: string;
  text?: string;
  fileUid?: string;
  attachmentTemplateId?: number;
  label?: string;
  replyTo?: string;
}

const messageSendToJid: ActionDefinition<Input> = {
  key: "message-send-to-jid",
  type: "perform",
  idempotent: false,
  resource: "message",
  title: "Send Message to JID",
  description: "Send a message to a chat or group by its WhatsApp JID (POST /messages/to_jid).",
  params: [
    {
      "key": "jid",
      "label": "JID",
      "type": "string",
      "required": true,
      "hint": "WhatsApp JID, e.g. 14840000000@s.whatsapp.net or 1203…@g.us for a group.",
    },
    {
      "key": "whatsappAccountPhone",
      "label": "From WhatsApp number",
      "type": "string",
      "hint":
        "International format, e.g. +14841111111. Defaults to the most recently connected account in the workspace.",
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
      "/messages/to_jid",
      compact({
        jid: input.jid,
        whatsapp_account_phone: input.whatsappAccountPhone,
        text: input.text,
        file_uid: input.fileUid,
        label: input.label,
        attachment_template_id: input.attachmentTemplateId,
        reply_to: input.replyTo,
      }),
    );
  },
};

export default messageSendToJid;
