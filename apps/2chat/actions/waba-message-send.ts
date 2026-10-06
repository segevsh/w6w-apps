import type { ActionDefinition } from "@w6w/types";
import { compact, parseJson, TwoChatClient } from "../lib/client.ts";

interface Input {
  fromNumber: string;
  toNumber: string;
  text?: string;
  templateUuid?: string;
  bodyParams?: unknown;
  headerParams?: unknown;
  buttonParams?: unknown;
  headerMediaUrl?: string;
  headerMediaFilename?: string;
}

const wabaMessageSend: ActionDefinition<Input> = {
  key: "waba-message-send",
  type: "perform",
  idempotent: false,
  resource: "message",
  title: "Send WABA Message",
  description:
    "Send a WhatsApp Business API (WABA) message: an approved template (starts a conversation or " +
    "reopens one after 24 hours) or a free-form text inside the open 24-hour window (POST " +
    "/waba/send-message). Answers 202 once queued. Not idempotent. Billed per call and per WABA " +
    "credit.",
  params: [
    {
      key: "fromNumber",
      label: "From number",
      type: "string",
      required: true,
      hint: "Your WABA number, E.164.",
    },
    {
      key: "toNumber",
      label: "To number",
      type: "string",
      required: true,
      hint: "Recipient, E.164.",
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      hint: "Session message. Use this OR a template, never both.",
    },
    {
      key: "templateUuid",
      label: "Template UUID",
      type: "string",
      hint: "Starts with TMP, must be APPROVED. From List WABA Templates.",
    },
    {
      key: "bodyParams",
      label: "Body variables",
      type: "json",
      hint:
        'Positional array ["Maria","TRK-98452"], or an object for NAMED-variable templates. Count must match the template exactly.',
    },
    {
      key: "headerParams",
      label: "Header variables",
      type: "json",
      hint: "TEXT headers only.",
    },
    {
      key: "buttonParams",
      label: "Button variable",
      type: "json",
      hint: 'Dynamic URL button only: ["a1b2c3"].',
    },
    {
      key: "headerMediaUrl",
      label: "Header media URL",
      type: "string",
      hint: "IMAGE/VIDEO/DOCUMENT headers: public http(s) URL.",
    },
    {
      key: "headerMediaFilename",
      label: "Header media filename",
      type: "string",
      hint: "Optional, for DOCUMENT headers.",
    },
  ],
  output: [
    { key: "message_uuid", type: "string", label: "UUID to track the message" },
    { key: "batched", type: "boolean", label: "True when queued" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    if (input.text && input.templateUuid) {
      throw new Error("send either `text` or a template, not both");
    }
    if (!input.text && !input.templateUuid) {
      throw new Error("waba-message-send needs `text` or `templateUuid`");
    }
    const base = { from_number: input.fromNumber, to_number: input.toNumber };
    if (input.text) return client.post("/waba/send-message", { ...base, text: input.text });
    // `params` is required for a template even when empty.
    const params = compact({
      body: parseJson(input.bodyParams, "bodyParams"),
      header: parseJson(input.headerParams, "headerParams"),
      button: parseJson(input.buttonParams, "buttonParams"),
      header_media_url: input.headerMediaUrl,
      header_media_filename: input.headerMediaFilename,
    });
    return client.post("/waba/send-message", {
      ...base,
      template_uuid: input.templateUuid,
      params,
    });
  },
};

export default wabaMessageSend;
