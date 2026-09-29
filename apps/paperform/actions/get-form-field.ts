import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { fieldKeyParam, slugOrIdParam } from "../lib/params.ts";

interface Input {
  slugOrId: string;
  fieldKey: string;
}

/** `GET /forms/{slug_or_id}/fields/{field_key}` — a single field on a form by key. */
const getFormField: ActionDefinition<Input> = {
  key: "get-form-field",
  type: "read",
  resource: "field",
  title: "Get Form Field",
  description: "Get a single field on a form by its key.",
  params: [slugOrIdParam, fieldKeyParam],
  output: [{ key: "field", type: "object", label: "Field" }],

  async execute(input, ctx) {
    const results = await new PaperformClient(ctx).results<{ field?: unknown }>(
      `/forms/${encodeURIComponent(input.slugOrId)}/fields/${encodeURIComponent(input.fieldKey)}`,
    );
    return { field: results?.field };
  },
};

export default getFormField;
