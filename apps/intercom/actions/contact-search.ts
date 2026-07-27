import type { ActionDefinition } from "@w6w/types";
import { compact, IntercomClient } from "../lib/client.ts";

interface Input {
  field?: string;
  operator?: string;
  value?: string;
  query?: Record<string, unknown>;
  perPage?: number;
  startingAfter?: string;
}

/**
 * POST /contacts/search — Intercom lists contacts through its Search API, not a
 * plain GET: you pass a `query` (a single `{ field, operator, value }` filter or
 * a nested AND/OR tree) plus cursor `pagination`. This action builds the common
 * single-filter case from `field`/`operator`/`value`, or takes a full `query`
 * object verbatim for AND/OR trees.
 */
const contactSearch: ActionDefinition<Input> = {
  key: "contact-search",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description:
    "List/search contacts via Intercom's Search API. Provide a single field/operator/value filter, or a full query object for AND/OR trees.",
  params: [
    {
      key: "field",
      label: "Field",
      type: "string",
      row: "filter",
      hint: "e.g. `email`, `name`, `external_id`, `role`, `created_at`.",
    },
    {
      key: "operator",
      label: "Operator",
      type: "select",
      row: "filter",
      default: "=",
      options: [
        { value: "=", label: "equals (=)" },
        { value: "!=", label: "not equals (!=)" },
        { value: "IN", label: "in" },
        { value: "NIN", label: "not in" },
        { value: "<", label: "less than (<)" },
        { value: ">", label: "greater than (>)" },
        { value: "~", label: "contains (~)" },
        { value: "!~", label: "does not contain (!~)" },
        { value: "^", label: "starts with (^)" },
        { value: "$", label: "ends with ($)" },
      ],
    },
    { key: "value", label: "Value", type: "string", row: "filter" },
    {
      key: "query",
      label: "Query (advanced)",
      type: "json",
      advanced: true,
      hint: "Full Intercom search query object. Overrides field/operator/value when set.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 50,
      validation: { min: 1, max: 150, integer: true },
      hint: "Intercom caps this at 150.",
    },
    {
      key: "startingAfter",
      label: "Starting after cursor",
      type: "string",
      advanced: true,
      hint: "`pages.next.starting_after` from the previous page.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Contacts" },
    { key: "pages", type: "object", label: "Pagination (pages.next.starting_after)" },
    { key: "total_count", type: "number", label: "Total count" },
  ],

  execute(input, ctx) {
    const query = input.query ?? {
      field: input.field,
      operator: input.operator ?? "=",
      value: input.value,
    };
    const body: Record<string, unknown> = {
      query,
      pagination: compact({
        per_page: input.perPage ?? 50,
        starting_after: input.startingAfter,
      }),
    };
    return new IntercomClient(ctx).request("/contacts/search", { method: "POST", body });
  },
};

export default contactSearch;
