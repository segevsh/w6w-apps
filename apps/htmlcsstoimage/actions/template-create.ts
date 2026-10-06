import type { ActionDefinition } from "@w6w/types";
import { HctiClient } from "../lib/client.ts";
import { buildTemplateBody, templateParams } from "../lib/render.ts";

/**
 * `POST /v1/template` — save a new HTML/CSS template.
 *
 * Needs `templates:create_update`. Answers `{template_id, template_version}`. The HTML
 * must contain at least one Handlebars placeholder and compile, or the vendor answers 400
 * with `validationErrors`. Render it with `image-create-template`.
 *
 * Not idempotent: every call mints a new template id.
 */
interface Input extends Record<string, unknown> {
  html: string;
}

const templateCreate: ActionDefinition<Input> = {
  key: "template-create",
  type: "perform",
  resource: "template",
  title: "Create Template",
  description: "Save an HTML/CSS template with Handlebars variables for later rendering.",
  idempotent: false,
  params: templateParams,
  output: [
    { key: "template_id", type: "string", label: "Template ID" },
    { key: "template_version", type: "number", label: "Version (a millisecond timestamp)" },
  ],

  execute(input, ctx) {
    if (!input.html) throw new Error("html is required");
    return new HctiClient(ctx).json("/template", {
      method: "POST",
      body: buildTemplateBody(input),
    });
  },
};

export default templateCreate;
