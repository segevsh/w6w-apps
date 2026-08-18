import type { ActionDefinition } from "@w6w/types";
import { GustoClient } from "../lib/client.ts";

/**
 * `GET /v1/employees/{employee_id}/home_addresses` — where an employee lives,
 * over time.
 *
 * A list rather than a field, because the history matters: an employee who
 * moved mid-year has two addresses and two states' worth of tax consequences,
 * and `effective_date` is what says which applied when. `active` marks the
 * current one.
 *
 * This app reads addresses and does not write them. Changing where somebody
 * lives changes their tax withholding, and doing that from an automation
 * without the employee's involvement is a decision an HR system should make
 * deliberately — Gusto's self-service flow exists for exactly this.
 */
const action: ActionDefinition = {
  key: "employee-home-address-list",
  type: "read",
  resource: "employee",
  title: "List an employee's home addresses",
  description:
    "Home addresses with their effective dates — a history, because a mid-year move changes " +
    "which state's tax applied when.",
  params: [
    {
      key: "employeeId",
      label: "Employee ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Address UUID" },
    { key: "street_1", type: "string", label: "Street" },
    { key: "city", type: "string", label: "City" },
    { key: "state", type: "string", label: "State" },
    { key: "zip", type: "string", label: "ZIP" },
    { key: "effective_date", type: "string", label: "Effective date" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const employeeId = String(p.employeeId ?? "").trim();
    if (!employeeId) throw new Error("`employeeId` is required");
    return await new GustoClient(ctx).request(
      `/v1/employees/${encodeURIComponent(employeeId)}/home_addresses`,
    );
  },
};

export default action;
