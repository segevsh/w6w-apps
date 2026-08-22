import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";

/**
 * `PUT /people/{id}/department` — verified against Deel's own OpenAPI document
 * (`hris-endpoints.json`, `update-person-department`).
 *
 * A **PUT**, not a PATCH: the department is replaced outright, which is what
 * moving someone between teams means.
 */
const action: ActionDefinition = {
  key: "person-department-update",
  type: "perform",
  resource: "person",
  title: "Move a person to a department",
  description: "Set a worker's department.",
  idempotent: true,
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true, default: "" },
    {
      key: "departmentId",
      label: "Department ID",
      type: "string",
      required: true,
      default: "",
      hint: "An organization-structure id — see Deel's org structure settings.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Result" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const personId = String(p.personId ?? "").trim();
    const departmentId = String(p.departmentId ?? "").trim();
    if (!personId) throw new Error("`personId` is required");
    if (!departmentId) throw new Error("`departmentId` is required");

    ctx.log("info", "updating Deel person department", { personId, departmentId });

    return await new DeelClient(ctx).request(
      `/people/${encodeURIComponent(personId)}/department`,
      { method: "PUT", body: { data: { department_id: departmentId } } },
    );
  },
};

export default action;
