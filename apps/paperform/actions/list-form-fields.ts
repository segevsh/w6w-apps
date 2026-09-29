import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { slugOrIdParam } from "../lib/params.ts";

interface Input {
  slugOrId: string;
  search?: string;
}

/** `GET /forms/{slug_or_id}/fields` — the fields available on a form. */
const listFormFields: ActionDefinition<Input> = {
  key: "list-form-fields",
  type: "search",
  resource: "field",
  title: "List Form Fields",
  description: "List the fields on a specific form, optionally filtered by name search.",
  params: [slugOrIdParam, {
    key: "search",
    label: "Search",
    type: "string",
    hint: "Search fields by name.",
  }],
  output: [{ key: "fields", type: "array", label: "Fields" }],

  async execute(input, ctx) {
    const results = await new PaperformClient(ctx).results<{ fields?: unknown[] }>(
      `/forms/${encodeURIComponent(input.slugOrId)}/fields`,
      { query: { search: input.search } },
    );
    return { fields: results?.fields ?? [] };
  },
};

export default listFormFields;
