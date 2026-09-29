import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, PaperformClient } from "../lib/client.ts";
import { fieldKeyParam, slugOrIdParam } from "../lib/params.ts";

interface Input {
  slugOrId: string;
  fieldKey: string;
  title?: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  customKey?: string;
  typeOptions?: string | Record<string, unknown>;
}

/**
 * `PUT /forms/{slug_or_id}/fields/{field_key}` — update a field on a form.
 *
 * Paperform's `Field` schema is a discriminated union across ~24 field types (`text`,
 * `dropdown`, `choices`, `scale`, `rank`, `calculations`, `products`, …), each keyed by its
 * own type name and shaped differently (`{"dropdown": {"options": [...]}}`,
 * `{"calculations": {"calculation": "1 + 2"}}`, `{"products": {"products": [...]}}`, …).
 * Rather than a generated per-type form that would omit most of the catalog or drift out of
 * sync with it, the type-specific part is a free-form JSON object matching Paperform's own
 * request body 1:1 — the four examples in Paperform's own OpenAPI document are reproduced in
 * this param's hint. The standard properties every field shares (title, description,
 * required, placeholder, custom key) are ordinary params. `idempotent: true` — a PUT with the
 * same values leaves the field in the same state no matter how many times it runs.
 */
const updateFormField: ActionDefinition<Input> = {
  key: "update-form-field",
  type: "perform",
  resource: "field",
  title: "Update Form Field",
  description: "Update a field's standard properties and/or its type-specific options " +
    "(e.g. dropdown/choices/scale/rank options, a calculation, product list).",
  idempotent: true,
  params: [
    slugOrIdParam,
    fieldKeyParam,
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "required", label: "Required", type: "boolean" },
    { key: "placeholder", label: "Placeholder", type: "string" },
    { key: "customKey", label: "Custom key", type: "string", advanced: true },
    {
      key: "typeOptions",
      label: "Type-specific options (JSON)",
      type: "json",
      advanced: true,
      hint: "Only needed to change a field's type-specific options — the exact shape " +
        "Paperform's own API takes, keyed by the field's type. Examples from Paperform's own " +
        'docs: {"dropdown":{"options":["Option 1","Option 2"]}}, ' +
        '{"choices":{"options":["Option 1","Option 2"]}}, ' +
        '{"scale":{"options":["Option 1","Option 2"]}}, ' +
        '{"rank":{"options":["Option 1","Option 2"]}}, ' +
        '{"calculations":{"calculation":"1 + 2"}}, ' +
        '{"products":{"products":[{"SKU":"PRODUCT-1","name":"Product 1","price":1}]}}.',
      placeholder: JSON.stringify({ dropdown: { options: ["Option 1", "Option 2", "Option 3"] } }),
    },
  ],
  output: [{ key: "field", type: "object", label: "Updated field" }],

  async execute(input, ctx) {
    const typeOptions = asOptionalJson<Record<string, unknown>>(
      input.typeOptions,
      "Type-specific options",
    );
    const results = await new PaperformClient(ctx).results<{ field?: unknown }>(
      `/forms/${encodeURIComponent(input.slugOrId)}/fields/${encodeURIComponent(input.fieldKey)}`,
      {
        method: "PUT",
        body: {
          title: input.title,
          description: input.description,
          required: input.required,
          placeholder: input.placeholder,
          custom_key: input.customKey,
          ...typeOptions,
        },
      },
    );
    return { field: results?.field };
  },
};

export default updateFormField;
