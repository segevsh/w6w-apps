import type { ActionDefinition } from "@w6w/types";
import { encodeId, HctiClient } from "../lib/client.ts";
import { buildTemplateBody, templateParams } from "../lib/render.ts";

/**
 * `POST /v1/template/{id}` — save a new version of an existing template.
 *
 * Needs `templates:create_update`. Answers `{template_id, template_version}`. A template is
 * never edited in place: this adds a version, and renders that name only `template_id`
 * (no pinned version) use the newest one. The body is the full template (it replaces the previous version's
 * fields, it is not a patch).
 */
interface Input extends Record<string, unknown> {
  template_id: string;
  html: string;
}

const templateVersionCreate: ActionDefinition<Input> = {
  key: "template-version-create",
  type: "perform",
  resource: "template",
  title: "Create Template Version",
  description:
    "Save a new version of an existing template; renders without a pinned version use it.",
  idempotent: false,
  params: [
    { key: "template_id", label: "Template ID", type: "string", required: true },
    ...templateParams,
  ],
  output: [
    { key: "template_id", type: "string", label: "Template ID" },
    { key: "template_version", type: "number", label: "New version" },
  ],

  execute(input, ctx) {
    if (!input.template_id) throw new Error("template_id is required");
    if (!input.html) throw new Error("html is required");
    return new HctiClient(ctx).json(`/template/${encodeId(input.template_id)}`, {
      method: "POST",
      body: buildTemplateBody(input),
    });
  },
};

export default templateVersionCreate;
