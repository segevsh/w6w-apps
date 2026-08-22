import type { ActionDefinition } from "@w6w/types";
import { compact, WorkOSClient } from "../lib/client.ts";

/**
 * `PUT /user_management/users/{id}` — correct a name, or verify an address.
 *
 * The one to be careful with is `email_verified`. Setting it true here is the
 * same assertion `user-create` makes, applied to an account that already
 * exists: it unblocks password sign-in and makes the address eligible for
 * account linking. Setting it **false** is the useful and under-used direction
 * — it is how you lock an account whose address you no longer trust, without
 * deleting the record or its history.
 */
const action: ActionDefinition = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update a user",
  description:
    "Correct a name or change verification. Setting verified false locks password sign-in " +
    "without deleting the account — which is the useful direction.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
    { key: "firstName", label: "First Name", type: "string", default: "" },
    { key: "lastName", label: "Last Name", type: "string", default: "" },
    {
      key: "emailVerified",
      label: "Email Verified",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "Verified — allows password sign-in and account linking" },
        { value: "false", label: "Not verified — blocks password sign-in" },
      ],
    },
    { key: "externalId", label: "External ID", type: "string", default: "", advanced: true },
    { key: "metadata", label: "Metadata", type: "json", default: "", advanced: true },
  ],
  output: [{ key: "id", type: "string", label: "User ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.userId ?? "").trim();
    if (!id) throw new Error("`userId` is required");

    const verified = String(p.emailVerified ?? "");
    const body = compact({
      first_name: p.firstName,
      last_name: p.lastName,
      external_id: p.externalId,
      metadata: p.metadata,
    });
    if (verified === "true" || verified === "false") body.email_verified = verified === "true";
    if (Object.keys(body).length === 0) {
      throw new Error(
        "nothing to update — give a name, verification state, external id or metadata",
      );
    }

    return await new WorkOSClient(ctx).request(
      `/user_management/users/${encodeURIComponent(id)}`,
      { method: "PUT", body },
    );
  },
};

export default action;
