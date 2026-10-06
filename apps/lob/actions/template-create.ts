import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, LobClient } from "../lib/client.ts";

interface Input {
  html: string;
  description?: string;
  engine?: string;
  requiredVars?: unknown;
  metadata?: unknown;
}

const templateCreate: ActionDefinition<Input> = {
  key: "template-create",
  type: "perform",
  resource: "template",
  title: "Create Template",
  description:
    "Create a reusable HTML template (its first version). Reference the returned tmpl_ id as the artwork of a postcard, letter, self-mailer or check.",
  idempotent: false,
  params: [
    {
      key: "html",
      label: "HTML",
      type: "code",
      required: true,
      hint: "Up to Lob's size limit; use {{variable}} placeholders.",
    },
    { key: "description", label: "Description", type: "string" },
    {
      key: "engine",
      label: "Engine",
      type: "select",
      advanced: true,
      options: [{ value: "handlebars", label: "Handlebars" }, { value: "legacy", label: "Legacy" }],
      hint:
        "How {{merge variables}} are rendered. Lob's documented values are legacy and handlebars.",
    },
    {
      key: "requiredVars",
      label: "Required variables",
      type: "json",
      advanced: true,
      hint: 'Array of merge-variable names a mailpiece must supply, e.g. ["name"].',
    },
    { key: "metadata", label: "Metadata", type: "json", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "published_version", type: "object", label: "Published version" },
    { key: "versions", type: "array", label: "Versions" },
  ],

  execute(input, ctx) {
    return new LobClient(ctx).json("/templates", {
      method: "POST",
      body: compact({
        html: input.html,
        description: input.description,
        engine: input.engine,
        required_vars: asOptionalJson(input.requiredVars, "Required variables"),
        metadata: asOptionalJson(input.metadata, "Metadata"),
      }),
    });
  },
};

export default templateCreate;
