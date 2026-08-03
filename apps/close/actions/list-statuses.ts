import type { ActionDefinition } from "@w6w/types";
import { CloseClient, type CloseList, compact } from "../lib/client.ts";

interface Input {
  objectType: "lead" | "opportunity";
  fields?: string;
}

/**
 * `GET /status/lead/` and `GET /status/opportunity/` — the organization's
 * configured statuses.
 *
 * Two endpoints, one action, because they answer the same question about two
 * object types and the alternative is two near-identical files. The `objectType`
 * param picks the path.
 *
 * ## Why this action matters more than it looks
 *
 * Lead and Opportunity statuses are **customizable per organization** — they are
 * not a fixed enum this app could hard-code. Every `statusId` param elsewhere in
 * this app (Create Lead, Update Lead, Create Opportunity, Update Opportunity,
 * List Opportunities) needs a `stat_...` id that only exists in the customer's
 * own account, and this is the only way to discover one.
 *
 * Prefer the id over the label everywhere, for the reason Close itself gives on
 * the lead-create page: using `status_id` means "users can rename statuses in
 * the UI without breaking your implementation". A workflow keyed on the string
 * "Potential" breaks the day someone renames it to "Prospect"; one keyed on
 * `stat_...` does not.
 *
 * Opportunity statuses additionally carry a `status_type` of `active`, `won` or
 * `lost` — Close's fixed grouping over the customer's custom names, and what
 * List Opportunities' `statusType` filter matches on.
 */
const listStatuses: ActionDefinition<Input> = {
  key: "list-statuses",
  type: "read",
  resource: "status",
  title: "List Statuses",
  description:
    "List the organization's configured Lead or Opportunity statuses. The source of the " +
    "`stat_...` ids every status param in this app expects.",
  params: [
    {
      key: "objectType",
      label: "Object type",
      type: "select",
      required: true,
      default: "lead",
      options: [
        { value: "lead", label: "Lead statuses" },
        { value: "opportunity", label: "Opportunity statuses (pipeline stages)" },
      ],
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated fields to return (`_fields`). Opportunity statuses only.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Statuses" }],

  execute(input, ctx) {
    // Constrained to the two documented paths — the value is a `select`, so it
    // cannot smuggle a path segment even if a caller bypasses the form.
    const objectType = input.objectType === "opportunity" ? "opportunity" : "lead";
    return new CloseClient(ctx).request<CloseList>(`/status/${objectType}/`, {
      query: compact({ _fields: input.fields }),
    });
  },
};

export default listStatuses;
