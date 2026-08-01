import type { ActionDefinition } from "@w6w/types";
import { OktaClient } from "../lib/client.ts";

interface Input {
  userId: string;
  sendEmail?: boolean;
}

/**
 * Only valid for a user in `PROVISIONED` or `RECOVERY` status — it restarts
 * an activation that never completed. It is NOT the inverse of
 * `user-deactivate`; a `DEPROVISIONED` user must be recreated, not
 * reactivated.
 */
const userReactivate: ActionDefinition<Input> = {
  key: "user-reactivate",
  type: "perform",
  resource: "user",
  title: "Reactivate User",
  description: "Restart activation for a user stuck in PROVISIONED or RECOVERY status. " +
    "Not the inverse of Deactivate.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID or login", type: "string", required: true },
    {
      key: "sendEmail",
      label: "Send email",
      type: "boolean",
      default: true,
      hint: "Send the activation email to the user.",
    },
  ],
  output: [{ key: "activationToken", type: "string", label: "Activation token" }],

  execute(input, ctx) {
    return new OktaClient(ctx).request(
      `/users/${encodeURIComponent(input.userId)}/lifecycle/reactivate`,
      { method: "POST", query: { sendEmail: input.sendEmail ?? true } },
    );
  },
};

export default userReactivate;
