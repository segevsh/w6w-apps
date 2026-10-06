import type { ActionDefinition } from "@w6w/types";
import { compact, KudosityClient } from "../lib/client.ts";

/**
 * `POST /v2/whatsapp/messages` — one message to one recipient. The `content` object is keyed by
 * the `content_type`: `{text:{message}}`, `{template:{name, parameters?, locale?}}` or
 * `{custom:{…Meta Cloud API message…}}`. Templates must be pre-approved by WhatsApp.
 */
interface Input {
  recipient: string;
  contentType: "text" | "template" | "custom";
  sender?: string;
  text?: string;
  templateName?: string;
  templateParameters?: string[] | string;
  templateLocale?: string;
  custom?: Record<string, unknown> | string;
  smsFallbackMessage?: string;
  smsFallbackSender?: string;
  messageRef?: string;
}

function asJson<T>(value: T | string | undefined): T | undefined {
  return typeof value === "string" ? JSON.parse(value) as T : value;
}

export function buildContent(input: Input): Record<string, unknown> {
  switch (input.contentType) {
    case "text":
      if (!input.text) throw new Error("`text` is required when content type is text");
      return { text: { message: input.text } };
    case "template": {
      if (!input.templateName) {
        throw new Error("`templateName` is required when content type is template");
      }
      return {
        template: compact({
          name: input.templateName,
          parameters: asJson<string[]>(input.templateParameters),
          locale: input.templateLocale,
        }),
      };
    }
    case "custom": {
      const custom = asJson<Record<string, unknown>>(input.custom);
      if (!custom) throw new Error("`custom` is required when content type is custom");
      return { custom };
    }
    default:
      throw new Error(`unsupported content type: ${String(input.contentType)}`);
  }
}

const whatsappSend: ActionDefinition<Input> = {
  key: "whatsapp-send",
  type: "perform",
  resource: "whatsapp",
  title: "Send WhatsApp Message",
  description: "Send a WhatsApp text, pre-approved template or custom Meta Cloud API message to " +
    "one recipient, with an optional SMS fallback.",
  idempotent: false,
  params: [
    {
      key: "recipient",
      label: "Recipient",
      type: "string",
      required: true,
      hint: "E.164 international format. The recipient must have WhatsApp and have opted in.",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "select",
      required: true,
      default: "template",
      options: [
        { value: "text", label: "Text" },
        { value: "template", label: "Template" },
        { value: "custom", label: "Custom (Meta Cloud API)" },
      ],
    },
    {
      key: "sender",
      label: "Sender",
      type: "string",
      hint: "Registered WhatsApp sender in E.164. Optional when the account has a single sender.",
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      showIf: { "==": [{ var: "contentType" }, "text"] },
    },
    {
      key: "templateName",
      label: "Template name",
      type: "string",
      hint: "Exact, pre-approved template name, e.g. order_confirmation.",
      showIf: { "==": [{ var: "contentType" }, "template"] },
    },
    {
      key: "templateParameters",
      label: "Template parameters",
      type: "json",
      hint: 'JSON array of strings filling the placeholders in order, e.g. ["Tony", "#12345"].',
      showIf: { "==": [{ var: "contentType" }, "template"] },
    },
    {
      key: "templateLocale",
      label: "Template locale",
      type: "string",
      hint: "e.g. en_US. Defaults to en.",
      showIf: { "==": [{ var: "contentType" }, "template"] },
    },
    {
      key: "custom",
      label: "Custom message",
      type: "json",
      hint: "A Meta Cloud API message object, sent as `content.custom`.",
      showIf: { "==": [{ var: "contentType" }, "custom"] },
    },
    { key: "smsFallbackMessage", label: "SMS fallback message", type: "text" },
    { key: "smsFallbackSender", label: "SMS fallback sender", type: "string" },
    { key: "messageRef", label: "Message reference", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "sender", type: "string", label: "Sender" },
    { key: "recipient", type: "string", label: "Recipient" },
    { key: "content_type", type: "string", label: "Content type" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const { data } = await new KudosityClient(ctx).data("/whatsapp/messages", {
      method: "POST",
      body: compact({
        sender: input.sender,
        recipient: input.recipient,
        content_type: input.contentType,
        content: buildContent(input),
        sms_fallback: input.smsFallbackMessage
          ? compact({ sender: input.smsFallbackSender, message: input.smsFallbackMessage })
          : undefined,
        message_ref: input.messageRef,
      }),
    });
    return data as Record<string, unknown>;
  },
};

export default whatsappSend;
