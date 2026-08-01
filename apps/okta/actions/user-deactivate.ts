import type { ActionDefinition } from "@w6w/types";
import { OktaClient } from "../lib/client.ts";

interface Input {
  userId: string;
  sendEmail?: boolean;
}

/**
 * Deactivation moves a user to `DEPROVISIONED` — every app assignment and
 * group membership is unwound and the user can no longer sign in. It cannot
 * be undone with `user-reactivate` (see that action's notes); this is a
 * genuine offboarding step, not a suspend.
 */
const userDeactivate: ActionDefinition<Input> = {
  key: "user-deactivate",
  type: "perform",
  resource: "user",
  title: "Deactivate User",
  description:
    "Deactivate a user. Unwinds all app assignments and group memberships. Cannot be undone.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID or login", type: "string", required: true },
    {
      key: "sendEmail",
      label: "Send email",
      type: "boolean",
      default: false,
      hint: "Notify the org's administrators.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (202 on success, empty body)" }],

  execute(input, ctx) {
    return new OktaClient(ctx).request(
      `/users/${encodeURIComponent(input.userId)}/lifecycle/deactivate`,
      { method: "POST", query: { sendEmail: input.sendEmail ?? false } },
    );
  },
};

export default userDeactivate;
