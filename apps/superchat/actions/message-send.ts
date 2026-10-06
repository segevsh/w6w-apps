import type { ActionDefinition } from "@w6w/types";
import { SuperchatClient } from "../lib/client.ts";
import { dropUndefined } from "../lib/body.ts";

interface Input {
  channelId: string;
  to: string;
  senderName?: string;
  contentType: string;
  body?: string;
  fileId?: string;
  subject?: string;
  html?: string;
  text?: string;
  fileIds?: string[];
  templateId?: string;
  variables?: unknown[];
  customContent?: Record<string, unknown>;
  inReplyTo?: string;
}

/** Send a message on one of your channels (WhatsApp, SMS, email, Instagram, Messenger, Telegram) to a contact id, phone number (E.164) or email address. An unknown phone/email creates the contact. */
const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description:
    "Send a message on one of your channels (WhatsApp, SMS, email, Instagram, Messenger, Telegram) to a contact id, phone number (E.164) or email address. An unknown phone/email creates the contact.",
  idempotent: false,
  params: [
    {
      "key": "channelId",
      "label": "From channel ID",
      "type": "string",
      "required": true,
      "hint": "From List Channels.",
    },
    {
      "key": "to",
      "label": "To",
      "type": "string",
      "required": true,
      "hint": "A contact ID, an E.164 phone number or an email address.",
    },
    {
      "key": "senderName",
      "label": "Sender name",
      "type": "string",
      "hint": "Optional display name for the sender.",
    },
    {
      "key": "contentType",
      "label": "Content type",
      "type": "select",
      "required": true,
      "default": "text",
      "options": [
        { "value": "text", "label": "Text" },
        { "value": "media", "label": "Media (uploaded file)" },
        { "value": "email", "label": "Email" },
        { "value": "generic_template", "label": "Generic template" },
        { "value": "whats_app_template", "label": "WhatsApp template" },
        { "value": "custom", "label": "Custom content JSON (quick reply / list)" },
      ],
    },
    { "key": "body", "label": "Text", "type": "text", "hint": "For content type Text." },
    {
      "key": "fileId",
      "label": "File ID",
      "type": "string",
      "hint":
        "Uploaded file id: the media for Media, or the optional header file for a WhatsApp template.",
    },
    { "key": "subject", "label": "Email subject", "type": "string" },
    { "key": "html", "label": "Email HTML body", "type": "text" },
    { "key": "text", "label": "Email plain-text body", "type": "text" },
    {
      "key": "fileIds",
      "label": "Email attachment file IDs",
      "type": "json",
      "hint": "Array of uploaded file ids.",
    },
    {
      "key": "templateId",
      "label": "Template ID",
      "type": "string",
      "hint": "For the two template content types.",
    },
    {
      "key": "variables",
      "label": "Template variables",
      "type": "json",
      "hint": 'Array of {"position": 1, "value": "..."}.',
    },
    {
      "key": "customContent",
      "label": "Custom content",
      "type": "json",
      "hint":
        'The raw `content` object, for types without their own fields: {"type": "whats_app_quick_reply", "body": "...", "replies": [{"value": "Yes"}]} or {"type": "whats_app_list", ...}.',
    },
    { "key": "inReplyTo", "label": "In reply to (message ID)", "type": "string" },
  ],
  output: [
    { "key": "id", "type": "string", "label": "Message ID" },
    { "key": "conversation_id", "type": "string", "label": "Conversation ID" },
    {
      "key": "status",
      "type": "string",
      "label": "processed | sent | received | sending_failed | read",
    },
  ],

  execute(input, ctx) {
    let content: Record<string, unknown>;
    switch (input.contentType) {
      case "text":
        content = { type: "text", body: input.body };
        break;
      case "media":
        content = { type: "media", file_id: input.fileId };
        break;
      case "email":
        content = {
          type: "email",
          subject: input.subject,
          html: input.html,
          text: input.text,
          ...(input.fileIds ? { files: input.fileIds.map((id) => ({ id })) } : {}),
        };
        break;
      case "generic_template":
        content = {
          type: "generic_template",
          template_id: input.templateId,
          variables: input.variables,
        };
        break;
      case "whats_app_template":
        content = {
          type: "whats_app_template",
          template_id: input.templateId,
          variables: input.variables,
          ...(input.fileId ? { file: { id: input.fileId } } : {}),
        };
        break;
      case "custom":
        if (!input.customContent) {
          throw new Error("Superchat: custom content type needs the Custom content JSON");
        }
        content = input.customContent;
        break;
      default:
        throw new Error(`Superchat: unknown content type "${input.contentType}"`);
    }
    return new SuperchatClient(ctx).request("/messages", {
      method: "POST",
      body: {
        to: [{ identifier: input.to }],
        from: { channel_id: input.channelId, name: input.senderName ?? null },
        content: dropUndefined(content),
        ...(input.inReplyTo ? { in_reply_to: input.inReplyTo } : {}),
      },
    });
  },
};

export default messageSend;
