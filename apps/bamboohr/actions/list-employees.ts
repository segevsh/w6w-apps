import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

interface Input {
  fields?: string;
  sort?: string;
  filter?: Record<string, unknown>;
  limit?: number;
  after?: string;
  before?: string;
}

/**
 * `GET /api/v1/employees` — cursor-paginated employee list.
 *
 * This is the modern list endpoint and it differs from Get Employee in three
 * ways worth knowing, all documented:
 *
 *  - **It has a default field set.** `fields` here is "*additional* fields to
 *    include in each employee record beyond the default set" — unlike
 *    `GET /employees/{id}`, which returns only `id` without it.
 *  - **Pagination is cursor-based**, via deepObject `page[...]` keys:
 *    "`page[limit]` controls page size (default 250, maximum 2500). `page[after]`
 *    and `page[before]` accept opaque cursors returned in the previous
 *    response's `meta.page.nextCursor` / `prevCursor`; do not specify both at
 *    once."
 *  - **`filter` is deepObject too** — `filter[firstName]=Ava` — and multiple
 *    filter fields are ANDed.
 *
 * The deepObject encoding is done here rather than left to the caller because
 * it is the kind of detail that produces a 400 with no explanation. `filter` is
 * a `json` param so arbitrary documented filter keys work without this app
 * having to enumerate a per-company field set.
 */
const listEmployees: ActionDefinition<Input> = {
  key: "list-employees",
  type: "search",
  resource: "employee",
  title: "List Employees",
  description:
    "List employees with optional filtering and sorting, one cursor page at a time. Unlike Get " +
    "Employee this returns a default set of fields; `fields` adds to it.",
  params: [
    {
      key: "fields",
      label: "Additional fields",
      type: "string",
      placeholder: "workEmail,mobilePhone",
      hint: "Comma-separated fields to add BEYOND the default set this endpoint already returns. " +
        "Discover names with the List Fields action.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint:
        'JSON object of filter conditions, ANDed together — e.g. `{"firstName": "Ava"}`. Sent as ' +
        "deepObject `filter[key]=value`. `ids` accepts a comma-separated string of internal " +
        "employee IDs.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      placeholder: "lastName,-employeeId",
      hint: "Comma-separated sortable fields, `-` prefix for descending. Allowed: `employeeId`, " +
        "`firstName`, `lastName`, `preferredName`, `jobTitleName`, `status`. An invalid field " +
        "is a BadRequest.",
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      hint: "`page[limit]` — defaults to 250, maximum 2500.",
    },
    {
      key: "after",
      label: "After cursor",
      type: "string",
      hint:
        "`page[after]` — the opaque `meta.page.nextCursor` from the previous response. Do not " +
        "set this and Before at once.",
    },
    {
      key: "before",
      label: "Before cursor",
      type: "string",
      hint: "`page[before]` — the opaque `meta.page.prevCursor` from the previous response.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Employees" },
    {
      key: "meta",
      type: "object",
      label: "Pagination metadata (`page.nextCursor` / `prevCursor`)",
    },
  ],

  execute(input, ctx) {
    const query: Record<string, string | number | undefined> = {
      fields: input.fields,
      sort: input.sort,
      "page[limit]": input.limit,
      "page[after]": input.after,
      "page[before]": input.before,
    };
    // deepObject style, exactly as documented: `filter[firstName]=Ava`.
    for (const [k, v] of Object.entries(input.filter ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      query[`filter[${k}]`] = Array.isArray(v) ? v.join(",") : String(v);
    }
    return new BambooClient(ctx).request("/employees", { query });
  },
};

export default listEmployees;
