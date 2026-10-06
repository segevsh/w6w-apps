import type { ActionDefinition } from "@w6w/types";
import { compact, TimelinesClient } from "../lib/client.ts";

interface Input {
  phone: string;
  whatsappAccountPhone?: string;
  text?: string;
  fileUid?: string;
  attachmentTemplateId?: number;
  label?: string;
}

const messageSendToPhone: ActionDefinition<Input> = {
  key: "message-send-to-phone",
  type: "perform",
  idempotent: false,
  resource: "message",
  title: "Send Message to Phone",
  description:
    "Send a WhatsApp message to a phone number; no earlier chat or contact is needed (POST /messages). A text-and-file message costs 2 message credits.",
  params: [
    {
      "key": "phone",
      "label": "Phone",
      "type": "string",
      "required": true,
      "hint": "International format: +[country code][area code][number], e.g. +14840000000.",
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
  ],
  output: [
    { key: "data", type: "object", label: "message_uid of the queued message" },
  ],

  execute(input, ctx) {
    if (!input.text && !input.fileUid && !input.attachmentTemplateId) {
      throw new Error("provide `text`, `fileUid` or `attachmentTemplateId`");
    }
    return new TimelinesClient(ctx).post(
      "/messages",
      compact({
        phone: input.phone,
        whatsapp_account_phone: input.whatsappAccountPhone,
        text: input.text,
        file_uid: input.fileUid,
        label: input.label,
        attachment_template_id: input.attachmentTemplateId,
      }),
    );
  },
};

export default messageSendToPhone;
