import type { ActionDefinition } from "@w6w/types";
import { asStringArray, compact, EzTextingClient } from "../lib/client.ts";

/**
 * `POST /v1/messages` — "Create Message": send now, or at `sendAt`. Answers `201 {id}`.
 *
 * The API declares no idempotency key, so a retry would text real people twice:
 * `idempotent: false`.
 */
interface Input {
  message?: string;
  messageTemplateId?: string;
  companyName?: string;
  fromNumber?: string;
  toNumbers?: string[] | string;
  groupIds?: string[] | string;
  sendAt?: string;
  messageType?: string;
  mediaFileId?: string;
  mediaUrl?: string;
  strictValidation?: boolean;
}

const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send an SMS or MMS to phone numbers and/or contact groups, now or scheduled.",
  idempotent: false,
  params: [
    {
      key: "toNumbers",
      label: "To numbers",
      type: "array",
      item: { type: "string", placeholder: "2125551234" },
      hint: "Recipient phone numbers. Provide this and/or Group IDs.",
    },
    {
      key: "groupIds",
      label: "Group IDs",
      type: "array",
      item: { type: "string" },
      hint: "Contact group IDs to send to.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      hint: "The text to send. Omit when using a message template.",
    },
    {
      key: "fromNumber",
      label: "From number",
      type: "string",
      hint: "Only required when the account has more than one sending number.",
    },
    {
      key: "sendAt",
      label: "Send at",
      type: "datetime",
      hint: "When to send, e.g. 2020-12-03T10:15:30+00:00. Omit to send immediately.",
    },
    {
      key: "messageType",
      label: "Message type",
      type: "select",
      options: [{ value: "SMS", label: "SMS" }, { value: "MMS", label: "MMS" }],
      advanced: true,
    },
    { key: "messageTemplateId", label: "Message template ID", type: "string", advanced: true },
    {
      key: "companyName",
      label: "Company name",
      type: "string",
      hint: "If provided it is added as a prefix to the message.",
      advanced: true,
    },
    {
      key: "mediaFileId",
      label: "Media file ID",
      type: "string",
      hint: "A previously uploaded media file (see Create Media File).",
      advanced: true,
    },
    {
      key: "mediaUrl",
      label: "Media URL",
      type: "string",
      hint: "Image, video or audio URL, up to 5MB.",
      advanced: true,
    },
    {
      key: "strictValidation",
      label: "Strict validation",
      type: "boolean",
      hint:
        "If true, nothing is sent when any number is invalid. If false, invalid numbers are skipped.",
      advanced: true,
    },
  ],
  output: [{ key: "id", type: "string", label: "Message ID" }],

  async execute(input, ctx) {
    const result = await new EzTextingClient(ctx).json<{ id?: string }>("/messages", {
      method: "POST",
      body: compact({
        message: input.message,
        messageTemplateId: input.messageTemplateId,
        companyName: input.companyName,
        fromNumber: input.fromNumber,
        toNumbers: asStringArray(input.toNumbers),
        groupIds: asStringArray(input.groupIds),
        sendAt: input.sendAt,
        messageType: input.messageType,
        mediaFileId: input.mediaFileId,
        mediaUrl: input.mediaUrl,
        strictValidation: input.strictValidation,
      }),
    });
    ctx.log("info", "sent an EZ Texting message", { id: result?.id });
    return { id: result?.id };
  },
};

export default messageSend;
