import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/systemusers/{id}/unlock` (V1) — verified against JumpCloud's V1
 * OpenAPI document (`systemusers_unlock`).
 *
 * **Locked is not suspended.** A lock is what too many failed password attempts
 * produces; it clears with this call and nothing else about the account
 * changed. A suspension is a decision someone made, and this will not lift it —
 * `user-state-set` does. `user-get` distinguishes them: `account_locked` versus
 * `state: "SUSPENDED"`.
 */
const action: ActionDefinition = {
  key: "user-unlock",
  type: "perform",
  resource: "user",
  title: "Unlock a user",
  description: "Clear a lockout caused by failed login attempts. Does not lift a suspension.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "userId", type: "string", label: "User ID" },
    { key: "unlocked", type: "boolean", label: "Unlocked" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.userId ?? "").trim();
    if (!id) throw new Error("`userId` is required");

    ctx.log("info", "unlocking a JumpCloud user", { id });

    await new JumpCloudClient(ctx).request(`/systemusers/${encodeURIComponent(id)}/unlock`, {
      method: "POST",
    });
    return { userId: id, unlocked: true };
  },
};

export default action;
