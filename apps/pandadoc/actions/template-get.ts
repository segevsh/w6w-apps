import type { ActionDefinition } from "@w6w/types";
import { PandaDocClient } from "../lib/client.ts";

interface Input {
  templateId: string;
}

/**
 * `GET /public/v1/templates/{id}/details` — a template in full.
 *
 * This is the action to run *before* `document-create-from-template`: `roles`
 * names the recipient roles the create call's `recipients[].role` must match,
 * `tokens` names the variables it can fill, and `fields` names the fields it
 * can pre-fill. Guessing those names is the second most common way a create
 * call fails (after sending too early).
 */
const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template Details",
  description:
    "Read a template in full — its roles, tokens, fields, content placeholders and pricing. Use it to learn the role and token names Create Document needs.",
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "From Get Many Templates.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "roles", type: "array", label: "Recipient roles (match these in Create Document)" },
    { key: "tokens", type: "array", label: "Tokens" },
    { key: "fields", type: "array", label: "Fields" },
    { key: "content_placeholders", type: "array", label: "Content placeholders" },
    { key: "pricing", type: "object", label: "Pricing tables and quotes" },
    { key: "metadata", type: "object", label: "Metadata" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    return await new PandaDocClient(ctx).request(
      `/templates/${encodeURIComponent(input.templateId)}/details`,
    );
  },
};

export default templateGet;
