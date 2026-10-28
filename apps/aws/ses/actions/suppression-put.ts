import type { ActionDefinition } from "@w6w/types";
import { ses } from "../lib/api.ts";

/**
 * PutSuppressedDestination — `PUT /v2/email/suppression/addresses`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_PutSuppressedDestination.html
 */
interface Input {
  emailAddress: string;
  reason: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "suppression-put",
  type: "perform",
  resource: "suppression",
  title: "Add Suppressed Destination",
  description: "Add an address to the account suppression list so SES stops sending to it.",
  idempotent: true,
  params: [
    { key: "emailAddress", label: "Email address", type: "string", required: true },
    {
      key: "reason",
      label: "Reason",
      type: "select",
      required: true,
      options: [{ value: "BOUNCE", label: "Bounce" }, { value: "COMPLAINT", label: "Complaint" }],
    },
  ],
  output: [
    { key: "emailAddress", type: "string", label: "Address" },
    { key: "reason", type: "string", label: "Reason" },
    { key: "added", type: "boolean", label: "True when SES accepted it" },
  ],

  async execute(input, ctx) {
    await ses(ctx, {
      op: "PutSuppressedDestination",
      method: "PUT",
      path: "/v2/email/suppression/addresses",
      body: { EmailAddress: input.emailAddress, Reason: input.reason },
    });
    return { emailAddress: input.emailAddress, reason: input.reason, added: true };
  },
};

export default action;
