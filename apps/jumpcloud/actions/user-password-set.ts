import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/systemusers/{id}/password` (V1) — verified against JumpCloud's V1
 * OpenAPI document (`systemusers_password`).
 *
 * Sets a password directly, with no email to the user. That is the point — it
 * is how a helpdesk hands over a credential out of band — and it is also why
 * the new password never appears in a log line here.
 *
 * It does not force a change at next login. `user-password-expire` does that,
 * and the two are usually run together: set a temporary password, expire it, so
 * the person must choose their own.
 */
const action: ActionDefinition = {
  key: "user-password-set",
  type: "perform",
  resource: "user",
  title: "Set a user's password",
  description: "Set a password directly. The user is not emailed.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
    {
      key: "password",
      label: "New Password",
      type: "secret",
      required: true,
      default: "",
      hint: "Must satisfy the organization's password policy. Pair with Expire Password to " +
        "force a change at next login.",
    },
  ],
  output: [
    { key: "userId", type: "string", label: "User ID" },
    { key: "passwordSet", type: "boolean", label: "Password set" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.userId ?? "").trim();
    if (!id) throw new Error("`userId` is required");
    const password = String(p.password ?? "");
    if (!password) throw new Error("`password` is required");

    // Only the id is logged — the password is the whole payload.
    ctx.log("info", "setting a JumpCloud user's password", { id });

    await new JumpCloudClient(ctx).request(`/systemusers/${encodeURIComponent(id)}/password`, {
      method: "POST",
      body: { password },
    });
    return { userId: id, passwordSet: true };
  },
};

export default action;
