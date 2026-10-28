import type { ActionDefinition } from "@w6w/types";
import { seg, ses } from "../lib/api.ts";

/**
 * DeleteSuppressedDestination — `DELETE /v2/email/suppression/addresses/{EmailAddress}`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_DeleteSuppressedDestination.html
 */
interface Input {
  emailAddress: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "suppression-delete",
  type: "perform",
  resource: "suppression",
  title: "Remove Suppressed Destination",
  description: "Remove an address from the account suppression list.",
  idempotent: true,
  params: [
    { key: "emailAddress", label: "Email address", type: "string", required: true },
  ],
  output: [
    { key: "emailAddress", type: "string", label: "Address" },
    { key: "removed", type: "boolean", label: "True when SES accepted the removal" },
  ],

  async execute(input, ctx) {
    await ses(ctx, {
      op: "DeleteSuppressedDestination",
      method: "DELETE",
      path: `/v2/email/suppression/addresses/${seg(input.emailAddress)}`,
    });
    return { emailAddress: input.emailAddress, removed: true };
  },
};

export default action;
