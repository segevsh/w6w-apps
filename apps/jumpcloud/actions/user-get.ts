import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `GET /api/systemusers/{id}` (V1) — verified against JumpCloud's V1 OpenAPI
 * document (`systemusers_get`).
 */
const action: ActionDefinition = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get a user",
  description: "Retrieve one directory user by id.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      default: "",
      hint: "JumpCloud's 24-character object id, not the username or email.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "email", type: "string", label: "Email" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "state", type: "string", label: "STAGED, ACTIVATED or SUSPENDED" },
    { key: "activated", type: "boolean", label: "Activated" },
    { key: "suspended", type: "boolean", label: "Suspended" },
    { key: "account_locked", type: "boolean", label: "Locked out" },
    { key: "mfa", type: "object", label: "MFA configuration" },
    { key: "sudo", type: "boolean", label: "Has sudo on bound devices" },
    { key: "department", type: "string", label: "Department" },
    { key: "employeeIdentifier", type: "string", label: "Employee identifier" },
    { key: "externally_managed", type: "boolean", label: "Managed by an external directory" },
    { key: "created", type: "string", label: "Created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.userId ?? "").trim();
    if (!id) throw new Error("`userId` is required");

    ctx.log("info", "getting a JumpCloud user", { id });

    return await new JumpCloudClient(ctx).request(`/systemusers/${encodeURIComponent(id)}`);
  },
};

export default action;
