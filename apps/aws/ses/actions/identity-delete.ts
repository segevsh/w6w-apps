import type { ActionDefinition } from "@w6w/types";
import { seg, ses } from "../lib/api.ts";

/**
 * DeleteEmailIdentity — `DELETE /v2/email/identities/{EmailIdentity}`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_DeleteEmailIdentity.html
 */
interface Input {
  emailIdentity: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "identity-delete",
  type: "perform",
  resource: "identity",
  title: "Delete Identity",
  description:
    "Delete a sending identity. Mail from that address or domain stops sending immediately.",
  idempotent: true,
  params: [
    {
      key: "emailIdentity",
      label: "Identity",
      type: "string",
      required: true,
      hint: "The email address or domain to remove.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when SES accepted the deletion" },
    { key: "emailIdentity", type: "string", label: "The identity that was deleted" },
  ],

  async execute(input, ctx) {
    await ses(ctx, {
      op: "DeleteEmailIdentity",
      method: "DELETE",
      path: `/v2/email/identities/${seg(input.emailIdentity)}`,
    });
    return { deleted: true, emailIdentity: input.emailIdentity };
  },
};

export default action;
