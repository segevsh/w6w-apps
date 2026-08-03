import type { ActionDefinition } from "@w6w/types";
import { GravityFormsClient } from "../lib/client.ts";

interface Input {
  formId: string | number;
}

/**
 * `GET /gf/v2/forms/[FORM_ID]/field-filters` — the filters Gravity Forms itself
 * offers for a form, the same set that populates the search drop-down on the
 * entries list screen.
 *
 * Useful as the lookup step before Get Many Entries: it tells you which `key`
 * and `operator` combinations a form's `search[field_filters]` will actually
 * accept, instead of guessing at field IDs.
 *
 * The vendor returns the collection as the whole body, so it is nested under
 * `fieldFilters` here to give the action a declarable output shape.
 *
 * Capability: `gravityforms_view_entries`.
 */
const formFieldFiltersGet: ActionDefinition<Input> = {
  key: "form-field-filters-get",
  type: "read",
  resource: "form",
  title: "Get Form Field Filters",
  description:
    "Fetch the searchable field filters for a form — the keys and operators its entry search accepts.",
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
  ],
  output: [
    { key: "fieldFilters", type: "object", label: "Field filters for the form" },
  ],

  async execute(input, ctx) {
    const client = GravityFormsClient.fromConnection(ctx);
    const fieldFilters = await client.request<unknown>(
      `/forms/${encodeURIComponent(String(input.formId))}/field-filters`,
    );
    return { fieldFilters };
  },
};

export default formFieldFiltersGet;
