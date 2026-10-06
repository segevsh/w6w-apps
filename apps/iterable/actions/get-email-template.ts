import type { ActionDefinition } from "@w6w/types";
import { call, int, str } from "../lib/client.ts";

/**
 * `GET /api/templates/email/get` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "get-email-template",
  type: "read",
  resource: "template",
  title: "Get Email Template",
  description: "One Email template by id.",
  params: [
    { key: "templateId", label: "Template ID", type: "number", required: true },
    { key: "locale", label: "Locale", type: "string", hint: "Locale of the content to return." },
  ],
  output: [
    { key: "templateId", type: "number", label: "Template id" },
    { key: "name", type: "string", label: "Template name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const templateId = int("templateId", p.templateId);
    const locale = str(p.locale);
    if (templateId === undefined) throw new Error("`templateId` is required");
    ctx.log("info", "Iterable Get Email Template", { templateId });
    const out = await call(ctx, "GET", "/templates/email/get", {
      query: { "templateId": templateId, "locale": locale },
    });
    return out;
  },
};

export default action;
