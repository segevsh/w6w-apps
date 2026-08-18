import type { ActionDefinition } from "@w6w/types";
import { compact, GustoClient } from "../lib/client.ts";
import { VERSION_PARAM } from "../lib/params.ts";

/**
 * `PUT /v1/employees/{employee_id}` — change an employee's details.
 *
 * The **`version`** is required and is the whole safety model: it is the record
 * as you last read it, and Gusto refuses the write if anything changed in
 * between. That turns the classic lost-update — two systems editing one person,
 * last writer wins — into a `422` a workflow can retry.
 *
 * So this action asks for the version rather than fetching it itself. Re-reading
 * and forcing the write through would defeat the lock: the caller would be
 * overwriting a change they never saw, which is exactly what the mechanism
 * exists to prevent. The error message names the case explicitly when it
 * happens.
 *
 * **`ssn` is deliberately not offered.** Gusto accepts it here, but a Social
 * Security number moving through a workflow is a liability nobody asked for,
 * and self-onboarding collects it from the employee directly. The same reasoning
 * keeps bank details out of this app entirely.
 */
const action: ActionDefinition = {
  key: "employee-update",
  type: "perform",
  resource: "employee",
  title: "Update employee",
  description:
    "Change an employee's name, emails or date of birth. Requires the version you just read — " +
    "Gusto rejects a stale one rather than overwriting somebody else's change.",
  idempotent: true,
  params: [
    {
      key: "employeeId",
      label: "Employee ID",
      type: "string",
      required: true,
      default: "",
    },
    VERSION_PARAM,
    { key: "firstName", label: "First Name", type: "string", default: "" },
    { key: "middleInitial", label: "Middle Initial", type: "string", default: "", advanced: true },
    { key: "lastName", label: "Last Name", type: "string", default: "" },
    {
      key: "preferredFirstName",
      label: "Preferred First Name",
      type: "string",
      default: "",
      advanced: true,
    },
    { key: "email", label: "Personal Email", type: "string", default: "" },
    { key: "workEmail", label: "Work Email", type: "string", default: "" },
    { key: "dateOfBirth", label: "Date of Birth", type: "date", default: "", advanced: true },
  ],
  output: [
    { key: "uuid", type: "string", label: "Employee UUID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "version", type: "string", label: "New version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const employeeId = String(p.employeeId ?? "").trim();
    if (!employeeId) throw new Error("`employeeId` is required");
    const version = String(p.version ?? "").trim();
    if (!version) {
      throw new Error(
        "`version` is required — read the employee immediately before updating and pass the " +
          "`version` it returned, which is what stops this overwriting a change you never saw",
      );
    }

    const body = compact({
      first_name: p.firstName,
      middle_initial: p.middleInitial,
      last_name: p.lastName,
      preferred_first_name: p.preferredFirstName,
      email: p.email,
      work_email: p.workEmail,
      date_of_birth: p.dateOfBirth,
    });
    if (Object.keys(body).length === 0) throw new Error("nothing to update");

    return await new GustoClient(ctx).request(`/v1/employees/${encodeURIComponent(employeeId)}`, {
      method: "PUT",
      body: { version, ...body },
    });
  },
};

export default action;
