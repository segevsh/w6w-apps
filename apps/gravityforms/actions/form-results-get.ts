import type { ActionDefinition } from "@w6w/types";
import { GravityFormsClient, serializeSearch } from "../lib/client.ts";

interface Input {
  formId: string | number;
  search?: unknown;
}

/**
 * `GET /gf/v2/forms/[FORM_ID]/results` — aggregated results for forms using the
 * Quiz, Polls or Survey add-ons.
 *
 * The optional `search` parameter is the same JSON blob the entries search
 * takes: `status` ("active" | "spam" | "trash", default "active"),
 * `field_filters` (each with `key`, `value`, `operator`, `is_numeric`) and
 * `mode` ("all" | "any").
 *
 * The response is a single aggregate object with no stable top-level key set,
 * so it is nested under `results` to give the action a declarable output shape.
 */
const formResultsGet: ActionDefinition<Input> = {
  key: "form-results-get",
  type: "read",
  resource: "form",
  title: "Get Form Results",
  description:
    "Fetch aggregated results for a Quiz, Poll or Survey form — entry counts and per-field aggregates.",
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
    {
      key: "search",
      label: "Search",
      type: "json",
      hint: 'Restricts which entries are aggregated, e.g. {"status":"active","mode":"all",' +
        '"field_filters":[{"key":"2","value":"yes","operator":"is"}]}.',
    },
  ],
  output: [
    { key: "results", type: "object", label: "Aggregated results for the form" },
  ],

  async execute(input, ctx) {
    const client = GravityFormsClient.fromConnection(ctx);
    const results = await client.request<unknown>(
      `/forms/${encodeURIComponent(String(input.formId))}/results`,
      { query: { search: serializeSearch(input.search) } },
    );
    return { results };
  },
};

export default formResultsGet;
