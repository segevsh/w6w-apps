import type { ActionDefinition } from "@w6w/types";
import { compact, parseJsonParam, sendResult, SolapiClient } from "../lib/client.ts";

/**
 * Send Message — Send one SMS, LMS or MMS. The type is detected from the text length (90 bytes or less is SMS, longer or with a subject is LMS, with an image is MMS) unless set. The sender number must be pre-registered.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  to: string;
  from: string;
  text: string;
  type?: string;
  subject?: string;
  imageId?: string;
  country?: string;
  scheduledDate?: string;
  strict?: boolean;
  allowDuplicates?: boolean;
  customFields?: unknown;
}

const sendMessage: ActionDefinition<Input> = {
  key: "send-message",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description:
    "Send one SMS, LMS or MMS. The type is detected from the text length (90 bytes or less is SMS, longer or with a subject is LMS, with an image is MMS) unless set. The sender number must be pre-registered.",
  idempotent: false,
  params: [
    {
      "key": "to",
      "label": "To",
      "type": "string",
      "required": true,
      "hint":
        "Recipient number, digits only (01012345678). For an international number omit the + and country code and set Country.",
    },
    {
      "key": "from",
      "label": "From",
      "type": "string",
      "required": true,
      "hint": "A sender number registered in your account (see List Sender Numbers).",
    },
    {
      "key": "text",
      "label": "Text",
      "type": "text",
      "required": true,
      "hint":
        "Message body. SMS holds 90 bytes (Korean characters count 2), LMS/MMS up to 2,000 bytes.",
    },
    {
      "key": "type",
      "label": "Type",
      "type": "select",
      "hint": "Leave empty to auto-detect from the text.",
      "options": [
        {
          "value": "SMS",
          "label": "SMS",
        },
        {
          "value": "LMS",
          "label": "LMS",
        },
        {
          "value": "MMS",
          "label": "MMS",
        },
      ],
    },
    {
      "key": "subject",
      "label": "Subject",
      "type": "string",
      "hint":
        "LMS/MMS title, 40 bytes. Setting it forces LMS. Empty: the first 40 bytes of the text.",
    },
    {
      "key": "imageId",
      "label": "Image ID",
      "type": "string",
      "hint":
        "MMS only: the fileId of an image uploaded to SOLAPI storage (JPG, up to 200 KB). See List Files.",
    },
    {
      "key": "country",
      "label": "Country code",
      "type": "string",
      "hint": "Default 82 (Korea). 1 US/Canada, 86 China, 81 Japan.",
    },
    {
      "key": "scheduledDate",
      "label": "Scheduled date",
      "type": "string",
      "hint":
        "ISO 8601 with a time zone, e.g. 2026-10-07T09:00:00+09:00. A time in the past sends immediately. Balance is deducted at send time, but the daily send limit counts at scheduling time.",
    },
    {
      "key": "strict",
      "label": "Strict validation",
      "type": "boolean",
      "hint":
        "Default false: SOLAPI silently strips invalid characters and derives a missing LMS/MMS subject from the text. true rejects such messages instead.",
    },
    {
      "key": "allowDuplicates",
      "label": "Allow duplicate recipients",
      "type": "boolean",
      "hint": "Default false: a recipient number repeated inside the same batch is dropped.",
    },
    {
      "key": "customFields",
      "label": "Custom fields",
      "type": "json",
      "hint":
        "Free-form string key/value pairs stored with the message (key up to 30 chars, value up to 1,000).",
    },
  ],
  output: [
    {
      "key": "groupId",
      "type": "string",
      "label": "Group the message was filed under",
    },
    {
      "key": "status",
      "type": "string",
      "label": "Group status (PENDING, SENDING, COMPLETE, SCHEDULED, ...)",
    },
    {
      "key": "count",
      "type": "object",
      "label": "Group counters (total, sentTotal, sentFailed, registeredFailed, ...)",
    },
    {
      "key": "failedCount",
      "type": "number",
      "label": "Messages SOLAPI refused to register",
    },
    {
      "key": "failedMessageList",
      "type": "array",
      "label": "Messages that were NOT sent, each with a statusCode and statusMessage",
    },
    {
      "key": "messageList",
      "type": "array",
      "label": "Registered messages with their messageId and statusCode",
    },
  ],

  async execute(input, ctx) {
    const body = await new SolapiClient(ctx).json("/messages/v4/send-many/detail", {
      method: "POST",
      body: {
        messages: [
          compact({
            to: input.to,
            from: input.from,
            text: input.text,
            type: input.type,
            subject: input.subject,
            imageId: input.imageId,
            country: input.country,
            customFields: parseJsonParam(input.customFields, "customFields"),
          }),
        ],
        scheduledDate: input.scheduledDate,
        strict: input.strict,
        allowDuplicates: input.allowDuplicates,
        showMessageList: true,
      },
    });
    return sendResult(body);
  },
};

export default sendMessage;
