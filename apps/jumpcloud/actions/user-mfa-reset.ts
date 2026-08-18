import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/systemusers/{id}/resetmfa` (V1) — verified against JumpCloud's V1
 * OpenAPI document (`systemusers_resetmfa`).
 *
 * Clears the user's enrolled TOTP factor so they can enrol a new authenticator
 * — the "I lost my phone" call. **It lowers the account's protection until they
 * re-enrol**, which is exactly why it is worth being a deliberate action rather
 * than a field on an update, and why it logs at `warn`.
 */
const action: ActionDefinition = {
  key: "user-mfa-reset",
  type: "perform",
  resource: "user",
  title: "Reset a user's MFA",
  description: "Clear the enrolled TOTP factor so the user can enrol a new authenticator.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "userId", type: "string", label: "User ID" },
    { key: "mfaReset", type: "boolean", label: "MFA reset" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.userId ?? "").trim();
    if (!id) throw new Error("`userId` is required");

    // Worth a warn: between this call and re-enrolment the account has one factor.
    ctx.log("warn", "resetting a JumpCloud user's MFA", { id });

    await new JumpCloudClient(ctx).request(`/systemusers/${encodeURIComponent(id)}/resetmfa`, {
      method: "POST",
    });
    return { userId: id, mfaReset: true };
  },
};

export default action;
