import type { ActionDefinition } from "@w6w/types";
import { WorkOSClient } from "../lib/client.ts";

/**
 * `GET /directory_users/{id}` — one person as the customer's directory has them.
 *
 * The field worth knowing about is **`custom_attributes`**, and it is the
 * reason this action exists separately from the listing. WorkOS maps a
 * customer's own SCIM attributes into it — department, cost centre, employee
 * number, manager — and those are exactly the values a provisioning workflow
 * needs to decide what role to grant.
 *
 * They are also **per-directory**: what Acme calls `department` their next
 * customer calls `dept`, so a workflow reading a fixed key works for one
 * customer and silently produces `undefined` for the next. The attribute names
 * are returned alongside the values here so that mismatch is visible rather
 * than mysterious.
 */
const action: ActionDefinition = {
  key: "directory-user-get",
  type: "read",
  resource: "directory-user",
  title: "Get a directory user",
  description: "One person from a customer's directory, including the custom SCIM attributes a " +
    "provisioning rule reads — whose names differ per customer.",
  params: [
    {
      key: "directoryUserId",
      label: "Directory User ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "directory_user_01E1JG7J09H96KYP8HM9B0G5SJ",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Directory user ID" },
    { key: "state", type: "string", label: "State — active or suspended" },
    { key: "custom_attributes", type: "object", label: "The customer's own SCIM attributes" },
    {
      key: "customAttributeNames",
      type: "array",
      label: "Attribute names present — they differ per customer",
    },
    { key: "groups", type: "array", label: "Directory groups this user belongs to" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.directoryUserId ?? "").trim();
    if (!id) throw new Error("`directoryUserId` is required");

    const user = await new WorkOSClient(ctx).request<
      { custom_attributes?: Record<string, unknown> }
    >(`/directory_users/${encodeURIComponent(id)}`);

    return {
      ...user,
      customAttributeNames: Object.keys(user?.custom_attributes ?? {}).sort(),
    };
  },
};

export default action;
