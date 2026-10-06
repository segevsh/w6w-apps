import type { ActionDefinition } from "@w6w/types";
import { compact, MailerSendClient, seg } from "../lib/client.ts";

interface Input {
  identityId: string;
  name?: string;
  replyToEmail?: string;
  replyToName?: string;
}

const updateSenderIdentity: ActionDefinition<Input> = {
  key: "update-sender-identity",
  type: "perform",
  resource: "sender-identity",
  title: "Update Sender Identity",
  description:
    "Change a sender identity's name or reply-to (PUT /v1/identities/{id}). The address itself cannot be changed.",
  idempotent: true,
  params: [
    { key: "identityId", label: "Identity ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", hint: "Max 191 characters." },
    {
      key: "replyToEmail",
      label: "Reply-to email",
      type: "string",
      hint: "Required when Reply-to name is set.",
    },
    { key: "replyToName", label: "Reply-to name", type: "string" },
  ],
  output: [{ key: "data", type: "object", label: "The updated identity" }],

  execute(input, ctx) {
    return new MailerSendClient(ctx).json(`/identities/${seg(input.identityId)}`, {
      method: "PUT",
      body: compact({
        name: input.name,
        reply_to_email: input.replyToEmail,
        reply_to_name: input.replyToName,
      }),
    });
  },
};

export default updateSenderIdentity;
