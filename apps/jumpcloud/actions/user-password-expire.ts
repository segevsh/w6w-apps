import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/systemusers/{id}/expire` (V1) — verified against JumpCloud's V1
 * OpenAPI document (`systemusers_expire`).
 *
 * Expires the current password so the user must set a new one at next login.
 * It does **not** revoke existing sessions or device logins — someone already
 * signed in stays signed in. If the intent is "cut this person off now", that
 * is `user-state-set` with suspend.
 */
const action: ActionDefinition = {
  key: "user-password-expire",
  type: "perform",
  resource: "user",
  title: "Expire a user's password",
  description: "Force a password change at next login. Does not end current sessions.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "userId", type: "string", label: "User ID" },
    { key: "expired", type: "boolean", label: "Password expired" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.userId ?? "").trim();
    if (!id) throw new Error("`userId` is required");

    ctx.log("info", "expiring a JumpCloud user's password", { id });

    await new JumpCloudClient(ctx).request(`/systemusers/${encodeURIComponent(id)}/expire`, {
      method: "POST",
    });
    return { userId: id, expired: true };
  },
};

export default action;
