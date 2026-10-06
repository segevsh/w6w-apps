import type { ActionDefinition } from "@w6w/types";
import { call, parseJsonField, parseList, requireStr } from "../lib/client.ts";
import { json, str, text } from "../lib/params.ts";

type Input = Record<string, unknown>;

const whatsappTemplateSend: ActionDefinition<Input> = {
  key: "whatsapp-template-send",
  type: "perform",
  resource: "whatsapp",
  title: "Send WhatsApp Template",
  description:
    "Send an approved WhatsApp template message from an integrated number to one or many recipients.",
  idempotent: false,
  params: [
    str("integratedNumber", "From (integrated number)", {
      required: true,
      hint: "Your WhatsApp number as integrated in MSG91, with country code.",
    }),
    str("templateName", "Template name", { required: true }),
    str("languageCode", "Language code", { required: true, hint: "e.g. en, en_US, hi." }),
    text("to", "To", {
      required: true,
      hint: "Comma-separated recipient numbers with country code. All get the same Components.",
    }),
    json("components", "Components", {
      hint:
        'Template values as an object, e.g. {"body_1": {"type": "text", "value": "Ada"}, "header_1": {"type": "image", "value": "https://…"}}.',
    }),
    json("toAndComponents", "Per-recipient components", {
      hint:
        'Advanced: an array of {"to": ["91…"], "components": {…}}. Overrides To and Components.',
    }),
  ],
  output: [
    { key: "requestId", type: "string", label: "Request ID" },
    { key: "message", type: "string", label: "MSG91's message" },
  ],

  async execute(input, ctx) {
    let toAndComponents: unknown;
    if (
      input.toAndComponents !== undefined && input.toAndComponents !== null &&
      input.toAndComponents !== ""
    ) {
      toAndComponents = parseJsonField("toAndComponents", input.toAndComponents);
      if (!Array.isArray(toAndComponents) || toAndComponents.length === 0) {
        throw new Error("toAndComponents must be a non-empty JSON array");
      }
    } else {
      const to = parseList("to", input.to);
      if (to.length === 0) throw new Error("to or toAndComponents is required");
      toAndComponents = [{
        to,
        components: parseJsonField("components", input.components) ?? {},
      }];
    }
    const body = {
      integrated_number: requireStr("integratedNumber", input.integratedNumber),
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: requireStr("templateName", input.templateName),
          language: {
            code: requireStr("languageCode", input.languageCode),
            policy: "deterministic",
          },
          to_and_components: toAndComponents,
        },
      },
    };
    const res = await call(ctx, "POST", "/whatsapp/whatsapp-outbound-message/bulk/", { body });
    return {
      requestId: res.request_id ?? null,
      message: typeof res.data === "string" ? res.data : null,
    };
  },
};

export default whatsappTemplateSend;
