import type { ActionDefinition } from "@w6w/types";
import { compact, json, JumpCloudClient } from "../lib/client.ts";

/**
 * `PUT /api/systemusers/{id}` (V1) — verified against JumpCloud's V1 OpenAPI
 * document (`systemusers_put`).
 *
 * JumpCloud's PUT behaves as a **merge**, not a replace: fields left out are
 * kept. That is the forgiving behaviour, but it means an empty string is not
 * "leave alone" — it is "set to empty" — so unset fields are dropped here
 * rather than sent blank.
 *
 * State changes are deliberately **not** available on this action even though
 * the field exists on the endpoint. Suspending someone is an access decision
 * and belongs to `user-state-set`, where it is one explicit choice rather than
 * one field among twenty.
 */
const action: ActionDefinition = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update a user",
  description: "Change a user's profile fields. Does not change their state.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
    { key: "email", label: "Email", type: "string", default: "" },
    { key: "firstname", label: "First Name", type: "string", default: "" },
    { key: "lastname", label: "Last Name", type: "string", default: "" },
    { key: "displayname", label: "Display Name", type: "string", default: "" },
    { key: "department", label: "Department", type: "string", default: "" },
    { key: "jobTitle", label: "Job Title", type: "string", default: "" },
    { key: "company", label: "Company", type: "string", default: "" },
    { key: "location", label: "Location", type: "string", default: "" },
    { key: "employeeIdentifier", label: "Employee Identifier", type: "string", default: "" },
    {
      key: "attributes",
      label: "Custom Attributes",
      type: "json",
      default: "",
      hint: "Replaces the whole custom attribute array, so send all of them.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "email", type: "string", label: "Email" },
    { key: "state", type: "string", label: "State" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.userId ?? "").trim();
    if (!id) throw new Error("`userId` is required");

    const body = compact({
      email: p.email,
      firstname: p.firstname,
      lastname: p.lastname,
      displayname: p.displayname,
      department: p.department,
      jobTitle: p.jobTitle,
      company: p.company,
      location: p.location,
      employeeIdentifier: p.employeeIdentifier,
      attributes: json(p.attributes, "attributes"),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    ctx.log("info", "updating a JumpCloud user", { id, fields: Object.keys(body) });

    return await new JumpCloudClient(ctx).request(`/systemusers/${encodeURIComponent(id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
