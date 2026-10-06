import type { ActionDefinition } from "@w6w/types";
import { compact, MailerSendClient, toList } from "../lib/client.ts";

interface Input {
  html: string;
  text?: string;
  name?: string;
  domainId?: string;
  categories?: unknown;
  tags?: unknown;
  autoGenerate?: boolean;
}

const createTemplate: ActionDefinition<Input> = {
  key: "create-template",
  type: "perform",
  resource: "template",
  title: "Create Template",
  description:
    "Create an email template (POST /v1/templates). `text` is required by the API unless `autoGenerate` is true, in which case it is built from the HTML. Templates created here can later be edited with Update Template; templates built in the MailerSend app cannot.",
  idempotent: false,
  params: [
    { key: "html", label: "HTML body", type: "code", required: true },
    {
      key: "text",
      label: "Plain-text body",
      type: "text",
      hint: "Required unless Auto-generate is on.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: 'Max 50 characters. Defaults to "Template".',
    },
    { key: "domainId", label: "Domain ID", type: "string", hint: "Must belong to the account." },
    { key: "categories", label: "Category IDs", type: "json", hint: "Array of category ids." },
    { key: "tags", label: "Tags", type: "json", hint: "Up to 5, each up to 191 characters." },
    {
      key: "autoGenerate",
      label: "Auto-generate plain text",
      type: "boolean",
      hint: "Build the plain-text version from the HTML.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The created template" }],

  execute(input, ctx) {
    return new MailerSendClient(ctx).json("/templates", {
      method: "POST",
      body: compact({
        html: input.html,
        text: input.text,
        name: input.name,
        domain_id: input.domainId,
        categories: toList(input.categories),
        tags: toList(input.tags),
        auto_generate: input.autoGenerate,
      }),
    });
  },
};

export default createTemplate;
