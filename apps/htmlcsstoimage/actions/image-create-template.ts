import type { ActionDefinition } from "@w6w/types";
import { asJson, encodeId, HctiClient } from "../lib/client.ts";
import { buildBody } from "../lib/render.ts";

/**
 * `POST /v1/image/{template_id}` (latest version) or
 * `POST /v1/image/{template_id}/{template_version}` (pinned) — render a saved template.
 *
 * Needs `images:create`. The body is `{template_values}`, a non-empty JSON object keyed by
 * the template's Handlebars variable names (casing and nesting preserved), plus the
 * optional `format`.
 *
 * ## The route is documented, but absent from the OpenAPI file
 *
 * The OpenAPI `Templated Image Request` has `template_values` and no way to name the
 * template. The docs' "Creating an image with a template" section gives the path forms
 * above, which is what this action calls.
 *
 * Omitting the version renders the template's *latest* version, so a template edited
 * between two runs changes the output; pin the version for reproducible renders.
 * Spends image credits; not retry-safe.
 */
interface Input extends Record<string, unknown> {
  template_id: string;
  template_version?: number | string;
  template_values: unknown;
  format?: string;
}

const imageCreateTemplate: ActionDefinition<Input> = {
  key: "image-create-template",
  type: "perform",
  resource: "image",
  title: "Create Image from Template",
  description: "Render a saved template with your values to an image or PDF.",
  idempotent: false,
  params: [
    {
      key: "template_id",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "The `template_id` from Create Template, or `id` from List Templates (starts `t-`).",
    },
    {
      key: "template_version",
      label: "Template version",
      type: "number",
      hint: "Pin a version. Leave empty for the latest.",
    },
    {
      key: "template_values",
      label: "Template values",
      type: "json",
      required: true,
      hint: 'Non-empty object, e.g. {"title": "Hello"}.',
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      options: [
        { value: "png", label: "PNG" },
        { value: "jpg", label: "JPG" },
        { value: "jpeg", label: "JPEG" },
        { value: "webp", label: "WebP" },
        { value: "pdf", label: "PDF" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Image ID" },
    { key: "url", type: "string", label: "Image URL" },
  ],

  execute(input, ctx) {
    if (!input.template_id) throw new Error("template_id is required");
    const values = asJson<Record<string, unknown>>(input.template_values, "template_values");
    if (
      !values || typeof values !== "object" || Array.isArray(values) ||
      Object.keys(values).length === 0
    ) {
      throw new Error("template_values must be a non-empty JSON object");
    }
    const version = input.template_version === undefined || input.template_version === "" ||
        input.template_version === null
      ? ""
      : `/${encodeId(input.template_version)}`;
    const body = { template_values: values, ...buildBody({ format: input.format }, {}) };
    return new HctiClient(ctx).json(`/image/${encodeId(input.template_id)}${version}`, {
      method: "POST",
      body,
    });
  },
};

export default imageCreateTemplate;
