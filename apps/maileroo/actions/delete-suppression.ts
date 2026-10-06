import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, seg } from "../lib/client.ts";

interface Input {
  identifier: string;
}

/**
 * `DELETE /v1/suppressions/:identifier` (scope `suppressions.delete`). The identifier is the
 * numeric suppression ID or the email address (URL-encoded; `seg` does that).
 */
const deleteSuppression: ActionDefinition<Input> = {
  key: "delete-suppression",
  type: "perform",
  idempotent: false,
  resource: "suppression",
  title: "Remove Suppression",
  description: "Remove an address from the suppression list so it can receive email again. " +
    "Account API Key (suppressions.delete). A 404 means it was not suppressed.",
  params: [{
    key: "identifier",
    label: "Suppression ID or email address",
    type: "string",
    required: true,
  }],
  output: [{ key: "removed", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    await new MailerooClient(ctx).account(
      `/suppressions/${seg(input.identifier, "identifier")}`,
      { method: "DELETE" },
    );
    return { removed: true };
  },
};

export default deleteSuppression;
