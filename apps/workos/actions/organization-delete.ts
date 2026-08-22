import type { ActionDefinition } from "@w6w/types";
import { WorkOSClient } from "../lib/client.ts";

/**
 * `DELETE /organizations/{id}` — remove a customer, and everything under it.
 *
 * This takes the SSO connection, the directory, the memberships and the audit
 * log events with it. In practical terms **it locks that customer's entire
 * staff out of your product**, and there is no undo — a re-created organization
 * has a new id, so every foreign key pointing at the old one is stale, and the
 * SSO and SCIM setup has to be done again by the customer's own IT team.
 *
 * That is a large enough action to be worth typing something for, so it is
 * gated behind an explicit confirmation.
 */
const action: ActionDefinition = {
  key: "organization-delete",
  type: "perform",
  resource: "organization",
  title: "Delete an organization",
  description:
    "Remove a customer with its SSO connection, directory, memberships and audit events. " +
    "Irreversible, and it locks that customer's staff out.",
  idempotent: true,
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "confirm",
      label: "I understand this is irreversible",
      type: "boolean",
      required: true,
      default: false,
      hint: "Deleting takes the SSO connection and directory with it; a re-created organization " +
        "has a new id and needs the customer's IT team to set it up again.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.organizationId ?? "").trim();
    if (!id) throw new Error("`organizationId` is required");
    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` — deleting an organization removes its SSO connection, directory and " +
          "memberships, and cannot be undone",
      );
    }

    ctx.log("warn", "deleting a WorkOS organization", { organizationId: id });
    await new WorkOSClient(ctx).request(`/organizations/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return { ok: true };
  },
};

export default action;
