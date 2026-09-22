import type { ActionDefinition } from "@w6w/types";
import { SimpleTextingClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /api/custom-fields` — "Get all Custom Fields".
 *
 * A page of `{label, type, mergeTag, defaultMaxLength}` — the fields the account
 * has defined, which is what makes the two spellings in `customFields`
 * (`{"Street address": …}` and `{"street_address": …}`) discoverable rather than
 * guesswork: `label` is the first spelling, `mergeTag` the second.
 *
 * `defaultMaxLength` is the per-field length the account configured, and it is
 * what a campaign's `customFieldsMaxLength` overrides for one send. Reading both
 * here is how a workflow sizes a personalised message before it costs credits —
 * the length that matters is the *substituted* value, not the template.
 */
interface Input {
  page?: number;
  size?: number;
}

const customFieldList: ActionDefinition<Input> = {
  key: "custom-field-list",
  type: "search",
  resource: "custom-field",
  title: "List Custom Fields",
  description: "List the account's custom fields, with their merge tags and length limits.",
  params: paginationParams(),
  output: [
    { key: "content", type: "array", label: "Custom fields" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalElements", type: "number", label: "Total elements" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).page("/api/custom-fields", {
      query: { page: input.page, size: input.size },
    });
  },
};

export default customFieldList;
