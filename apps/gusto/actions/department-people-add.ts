import type { ActionDefinition } from "@w6w/types";
import { csv, GustoClient } from "../lib/client.ts";
import { VERSION_PARAM } from "../lib/params.ts";

/**
 * `PUT /v1/departments/{department_uuid}/add` — put people in a department.
 *
 * Employees and contractors are separate lists in the body, because they are
 * separate collections everywhere in Gusto. Passing an employee uuid in the
 * contractor list does not move them; it fails.
 *
 * The department's **`version`** is required, like every Gusto write. Adding
 * somebody who is already a member is not an error, which makes this safe to
 * re-run — as long as the version is fresh.
 */
const action: ActionDefinition = {
  key: "department-people-add",
  type: "perform",
  resource: "department",
  title: "Add people to a department",
  description:
    "Add employees or contractors to a department. They are separate lists, because they are " +
    "separate collections everywhere in Gusto.",
  idempotent: true,
  params: [
    {
      key: "departmentId",
      label: "Department ID",
      type: "string",
      required: true,
      default: "",
    },
    VERSION_PARAM,
    {
      key: "employeeIds",
      label: "Employee IDs",
      type: "string",
      default: "",
      hint: "Comma-separated employee uuids.",
    },
    {
      key: "contractorIds",
      label: "Contractor IDs",
      type: "string",
      default: "",
      hint: "Comma-separated contractor uuids. A contractor cannot go in the employee list.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Department UUID" },
    { key: "title", type: "string", label: "Title" },
    { key: "employees", type: "array", label: "Employees" },
    { key: "contractors", type: "array", label: "Contractors" },
    { key: "version", type: "string", label: "New version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const departmentId = String(p.departmentId ?? "").trim();
    if (!departmentId) throw new Error("`departmentId` is required");
    const version = String(p.version ?? "").trim();
    if (!version) throw new Error("`version` is required — read the department first");

    const employees = csv(p.employeeIds)?.map((uuid) => ({ uuid }));
    const contractors = csv(p.contractorIds)?.map((uuid) => ({ uuid }));
    if (!employees && !contractors) {
      throw new Error("give `employeeIds`, `contractorIds`, or both");
    }

    return await new GustoClient(ctx).request(
      `/v1/departments/${encodeURIComponent(departmentId)}/add`,
      {
        method: "PUT",
        body: {
          version,
          ...(employees ? { employees } : {}),
          ...(contractors ? { contractors } : {}),
        },
      },
    );
  },
};

export default action;
