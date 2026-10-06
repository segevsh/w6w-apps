import type { ActionDefinition } from "@w6w/types";
import { compact, MailerSendClient, seg, toList } from "../lib/client.ts";

interface Input {
  templateId: string;
  html?: string;
  text?: string;
  name?: string;
  domainId?: string;
  categories?: unknown;
  tags?: unknown;
  autoGenerate?: boolean;
}

const updateTemplate: ActionDefinition<Input> = {
  key: "update-template",
  type: "perform",
  resource: "template",
  title: "Update Template",
  description:
    "Update a template (PUT /v1/templates/{id}); only the fields you set are sent. Only templates created through the API can be updated: one built in the MailerSend app answers 404.",
  idempotent: true,
  params: [
    { key: "templateId", label: "Template ID", type: "string", required: true },
    { key: "html", label: "HTML body", type: "code" },
    { key: "text", label: "Plain-text body", type: "text" },
    { key: "name", label: "Name", type: "string", hint: "Max 50 characters." },
    { key: "domainId", label: "Domain ID", type: "string" },
    {
      key: "categories",
      label: "Category IDs",
      type: "json",
      hint: "Array of category ids. An empty array removes all categories.",
    },
    { key: "tags", label: "Tags", type: "json", hint: "Up to 5, each up to 191 characters." },
    { key: "autoGenerate", label: "Auto-generate plain text", type: "boolean" },
  ],
  output: [{ key: "data", type: "object", label: "The updated template" }],

  execute(input, ctx) {
    return new MailerSendClient(ctx).json(`/templates/${seg(input.templateId)}`, {
      method: "PUT",
      body: compact({
        html: input.html,
        text: input.text,
        name: input.name,
        domain_id: input.domainId,
        // An explicitly empty array is meaningful here (it clears the categories), so
        // it is passed through rather than dropped like an unset value.
        categories: Array.isArray(input.categories) ? input.categories : toList(input.categories),
        tags: toList(input.tags),
        auto_generate: input.autoGenerate,
      }),
    });
  },
};

export default updateTemplate;
