import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, LobClient } from "../lib/client.ts";

interface Input {
  templateId: string;
  html: string;
  description?: string;
  engine?: string;
  requiredVars?: unknown;
}

const templateVersionCreate: ActionDefinition<Input> = {
  key: "template-version-create",
  type: "perform",
  resource: "template",
  title: "Create Template Version",
  description:
    "Add a new version (new HTML) to an existing template. It is NOT published automatically; use Update Template to publish it.",
  idempotent: false,
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      placeholder: "tmpl_…",
    },
    { key: "html", label: "HTML", type: "code", required: true },
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
    { key: "requiredVars", label: "Required variables", type: "json", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Version ID" },
    { key: "html", type: "string", label: "HTML" },
    { key: "engine", type: "string", label: "Engine" },
    { key: "required_vars", type: "array", label: "Required variables" },
    { key: "date_created", type: "string", label: "Created" },
  ],

  execute(input, ctx) {
    return new LobClient(ctx).json(`/templates/${encodeId(input.templateId)}/versions`, {
      method: "POST",
      body: compact({
        html: input.html,
        description: input.description,
        engine: input.engine,
        required_vars: asOptionalJson(input.requiredVars, "Required variables"),
      }),
    });
  },
};

export default templateVersionCreate;
