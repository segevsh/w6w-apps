import type { ActionDefinition } from "@w6w/types";
import { compact, parseJson, TwoChatClient } from "../lib/client.ts";

interface Input {
  fromNumber: string;
  toNumber?: string;
  toRemoteId?: string;
  toGroupUuid?: string;
  text?: string;
  url?: string;
  pin?: unknown;
}

const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  idempotent: false,
  resource: "message",
  title: "Send WhatsApp Message",
  description:
    "Send a WhatsApp Web message from a connected number to a phone number, a username ID or a group " +
    "(POST /whatsapp/send-message): text, a media file by public URL, or a map pin. Queued, not " +
    "delivered, when it returns. Not idempotent: a retry sends a second message. Billed per call.",
  params: [
    {
      key: "fromNumber",
      label: "From number",
      type: "string",
      required: true,
      hint: "The number you connected to 2Chat, in international format.",
    },
    {
      key: "toNumber",
      label: "To number",
      type: "string",
      hint:
        "Recipient in international format. Use exactly one of To number, To remote ID or To group.",
    },
    {
      key: "toRemoteId",
      label: "To remote ID",
      type: "string",
      hint: "e.g. 123123123123@lid — only for a contact who shared a username instead of a number.",
    },
    {
      key: "toGroupUuid",
      label: "To group UUID",
      type: "string",
      hint: "Starts with WAG. From List Groups.",
    },
    {
      key: "text",
      label: "Text",
      type: "text",
    },
    {
      key: "url",
      label: "Media URL",
      type: "string",
      hint: "Publicly accessible file URL, at most 16 MB. Not a Google Drive link.",
    },
    {
      key: "pin",
      label: "Map pin",
      type: "json",
      hint:
        '{"latitude":"-25.77","longitude":"-56.64","name":"…","address":"…","url":"…"} — latitude and longitude are required.',
    },
  ],
  output: [
    { key: "message_uuid", type: "string", label: "UUID to track the message" },
    { key: "batched", type: "boolean", label: "True when queued for sending" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    const targets = [input.toNumber, input.toRemoteId, input.toGroupUuid].filter(Boolean).length;
    if (targets !== 1) {
      throw new Error("message-send needs exactly one of toNumber, toRemoteId or toGroupUuid");
    }
    const pin = parseJson(input.pin, "pin") as
      | { latitude?: unknown; longitude?: unknown }
      | undefined;
    if (pin && (pin.latitude === undefined || pin.longitude === undefined)) {
      throw new Error("`pin` needs both latitude and longitude");
    }
    if (!input.text && !input.url && !pin) {
      throw new Error("message-send needs at least one of text, url or pin");
    }
    return client.post(
      "/whatsapp/send-message",
      compact({
        from_number: input.fromNumber,
        to_number: input.toNumber,
        to_remote_id: input.toRemoteId,
        to_group_uuid: input.toGroupUuid,
        text: input.text,
        url: input.url,
        pin,
      }),
    );
  },
};

export default messageSend;
