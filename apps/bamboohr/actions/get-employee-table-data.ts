import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

interface Input {
  id: string;
  table: string;
}

/**
 * `GET /api/v1/employees/{id}/tables/{table}` — an employee's tabular (historical)
 * data.
 *
 * This is how you read the row-per-change tables that `GET /employees/{id}`
 * flattens to a single current value: job information, compensation, employment
 * status, and so on. Where the employee endpoint answers "what is their job
 * title", this answers "what has their job title been, and from when".
 *
 * Two documented affordances make it more useful than it first looks:
 *  - **`id` accepts the literal `all`** — "Use the special value `all` to
 *    retrieve table data for all employees the authenticated caller has access
 *    to." One call for a whole company's compensation history.
 *  - **Custom tables work here too** — "custom tables also accepted (e.g.
 *    `custom1`, `custom42`)".
 *
 * The `table` options are the standard API table names. They are offered as a
 * free-text field with a documented placeholder rather than a closed `select`
 * precisely because custom tables are valid values and a `select` would forbid
 * them; discover the full list, custom entries included, with
 * `GET /api/v1/meta/tables`.
 */
const getEmployeeTableData: ActionDefinition<Input> = {
  key: "get-employee-table-data",
  type: "read",
  resource: "employee",
  title: "Get Employee Table Data",
  description:
    "Read an employee's tabular history — job information, compensation, employment status and " +
    "custom tables. Pass `all` as the employee ID to fetch the table for every accessible employee.",
  params: [
    {
      key: "id",
      label: "Employee ID",
      type: "string",
      required: true,
      hint:
        "The INTERNAL employee ID, or the literal `all` for every employee the API key can see.",
    },
    {
      key: "table",
      label: "Table",
      type: "string",
      required: true,
      placeholder: "jobInfo",
      hint: "The table's API name — e.g. `jobInfo`, `compensation`, `employmentStatus`. Custom " +
        "tables (`custom1`, `custom42`) are also valid. Discover every name, custom ones " +
        "included, via `GET /api/v1/meta/tables`.",
    },
  ],
  output: [{ key: "rows", type: "array", label: "Table rows, oldest first" }],

  execute(input, ctx) {
    return new BambooClient(ctx).request(
      `/employees/${encodeURIComponent(input.id)}/tables/${encodeURIComponent(input.table)}`,
    );
  },
};

export default getEmployeeTableData;
