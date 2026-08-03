import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

interface Input {
  onlyCurrent?: boolean;
}

/**
 * `GET /api/v1/employees/directory` — the company directory.
 *
 * This is the call BambooHR's own Getting Started page uses to demonstrate a
 * working API key, and it is a genuinely different question from List Employees
 * rather than a duplicate of it. The docs draw the line: the directory is
 * "governed by directory sharing settings rather than by per-employee record
 * permissions and is available when directory or org-chart access is shared with
 * the caller's access level".
 *
 * So it answers "what does this person see in the company directory" — job
 * title, department, location, work contact details, reporting line — which is
 * both broader (no per-record permission gate) and narrower (only shared fields)
 * than the employee list. It also needs no `fields` parameter, because the field
 * set is whatever the company publishes.
 *
 * Consequence worth stating: if directory sharing is switched off for the key's
 * access level, this returns nothing useful while List Employees still works.
 * That is configuration, not a fault, which is why the auth `test` hook probes
 * `/employees/0` instead of here.
 */
const getEmployeesDirectory: ActionDefinition<Input> = {
  key: "get-employees-directory",
  type: "search",
  resource: "employee",
  title: "Get Employee Directory",
  description:
    "Fetch the company employee directory — the shared view of who works here, with the fields " +
    "the company publishes. Governed by directory sharing settings, not per-employee permissions.",
  params: [
    {
      key: "onlyCurrent",
      label: "Only current employees",
      type: "boolean",
      hint: "Defaults to true. Set false to include employees whose records are not current.",
    },
  ],
  output: [
    { key: "fields", type: "array", label: "Field descriptors published in the directory" },
    { key: "employees", type: "array", label: "Directory entries" },
  ],

  execute(input, ctx) {
    return new BambooClient(ctx).request("/employees/directory", {
      query: { onlyCurrent: input.onlyCurrent },
    });
  },
};

export default getEmployeesDirectory;
