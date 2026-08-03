import type { ActionDefinition } from "@w6w/types";
import { BambooClient, FIELDS_PARAM } from "../lib/client.ts";

interface Input {
  id: string;
  fields?: string;
  onlyCurrent?: boolean;
}

/**
 * `GET /api/v1/employees/{id}` — one employee, with explicitly named fields.
 *
 * Two documented behaviours drive the params, and both are silent failures if
 * ignored:
 *
 *  1. **`fields` is opt-in.** "With no `fields` parameter, the response contains
 *     only `id` — there is no implicit default field set." So an empty `fields`
 *     returns a body that looks empty rather than erroring. `FIELDS_PARAM` says
 *     so at the form. Max 400 fields.
 *  2. **`id` is the INTERNAL employee ID, not the Employee #.** The docs are
 *     blunt about the consequence: "Do not pass `employeeNumber` (the editable
 *     Employee # value); it may fail with `404` **or resolve to a different
 *     employee** if its value matches another employee's internal employee ID."
 *     Silently reading the wrong person's record is the worst outcome available
 *     here, so the hint says it.
 *
 * `0` is a documented sentinel for "the caller's own record", which is what the
 * auth `test` hook uses as a scope-free liveness probe.
 *
 * Field-level permissions apply silently — "any requested field the
 * authenticated caller cannot view is omitted from the response with no marker"
 * — so an absent field means either "not requested" or "not permitted", and the
 * two are indistinguishable. Stated in the README rather than swallowed here.
 */
const getEmployee: ActionDefinition<Input> = {
  key: "get-employee",
  type: "read",
  resource: "employee",
  title: "Get Employee",
  description:
    "Fetch one employee by internal employee ID. You must name the fields you want — BambooHR " +
    "returns only `id` otherwise. Pass `0` to read the record of the user the API key belongs to.",
  params: [
    {
      key: "id",
      label: "Employee ID",
      type: "string",
      required: true,
      hint: "The INTERNAL employee ID (the `id` from List Employees or the directory) — not the " +
        "editable Employee # shown on the profile. Passing an Employee # may 404 or, worse, " +
        "resolve to a different employee. `0` means the API key's own employee record.",
    },
    { ...FIELDS_PARAM },
    {
      key: "onlyCurrent",
      label: "Only current values",
      type: "boolean",
      hint:
        "Defaults to true: only currently effective values from historical tables (job title, " +
        "compensation, employment status) are returned. Set false to include future-dated values.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Internal employee ID" }],

  execute(input, ctx) {
    return new BambooClient(ctx).request(`/employees/${encodeURIComponent(input.id)}`, {
      query: { fields: input.fields, onlyCurrent: input.onlyCurrent },
    });
  },
};

export default getEmployee;
