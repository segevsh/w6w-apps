import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, LandbotClient, toArray, toStringList } from "../lib/client.ts";
import { bodyParams } from "../lib/fields.ts";

/**
 * Send WhatsApp Template — Send an approved WhatsApp template. Template ids come from List WhatsApp Templates; body parameters fill the {{1}}, {{2}} placeholders in order.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
  templateId: number;
  templateLanguage: string;
  bodyParams?: string;
  headerUrl?: string;
  headerParams?: string;
  buttons?: unknown;
}

const sendTemplate: ActionDefinition<Input> = {
  key: "send-template",
  type: "perform",
  resource: "message",
  title: "Send WhatsApp Template",
  description:
    "Send an approved WhatsApp template. Template ids come from List WhatsApp Templates; body parameters fill the {{1}}, {{2}} placeholders in order.",
  idempotent: false,
  params: [
    {
      "key": "customerId",
      "label": "Customer ID",
      "type": "number",
      "required": true,
      "hint": "Numeric Landbot customer id (from List Customers).",
    },
    {
      "key": "templateId",
      "label": "Template ID",
      "type": "number",
      "required": true,
      "hint": "From List WhatsApp Templates.",
    },
    {
      "key": "templateLanguage",
      "label": "Template language",
      "type": "string",
      "required": true,
      "hint": "Language code of the template, for example en or es.",
    },
    {
      "key": "bodyParams",
      "label": "Body parameters",
      "type": "string",
      "hint": "Comma-separated values for the body placeholders, or a JSON array of strings.",
    },
    {
      "key": "headerUrl",
      "label": "Header media URL",
      "type": "string",
      "hint": "Media URL for a template with a media header.",
    },
    {
      "key": "headerParams",
      "label": "Header parameters",
      "type": "string",
      "hint": "Comma-separated values for header placeholders.",
    },
    {
      "key": "buttons",
      "label": "Buttons",
      "type": "json",
      "hint": 'JSON array with one `{ "params": [...] }` object (or null) per template button.',
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Landbot accepted the request" },
  ],

  execute(input, ctx) {
    const header = compact({
      url: input.headerUrl,
      params: toStringList(input.headerParams).length
        ? toStringList(input.headerParams)
        : undefined,
    });
    const buttons = toArray(input.buttons, "buttons");
    return new LandbotClient(ctx).done(`/customers/${encodeId(input.customerId)}/send_template/`, {
      method: "POST",
      body: {
        template_id: input.templateId,
        template_language: input.templateLanguage,
        template_params: {
          ...(Object.keys(header).length ? { header } : {}),
          body: { params: bodyParams(input.bodyParams) },
          ...(buttons ? { buttons } : {}),
        },
      },
    });
  },
};

export default sendTemplate;
