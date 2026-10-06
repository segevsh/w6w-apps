import type { ActionDefinition } from "@w6w/types";
import { compact, MailerSendClient } from "../lib/client.ts";

interface Input {
  domainId: string;
  email: string;
  name?: string;
  replyToEmail?: string;
  replyToName?: string;
  addNote?: boolean;
  personalNote?: string;
}

const createSenderIdentity: ActionDefinition<Input> = {
  key: "create-sender-identity",
  type: "perform",
  resource: "sender-identity",
  title: "Create Sender Identity",
  description:
    "Add a sender identity (POST /v1/identities): MailerSend emails the address a verification link, and the identity can send once it is clicked. Use Resend Sender Identity Verification to send the link again.",
  idempotent: false,
  params: [
    { key: "domainId", label: "Domain ID", type: "string", required: true },
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "Max 320 characters, unique.",
    },
    { key: "name", label: "Name", type: "string", hint: "Max 191 characters." },
    {
      key: "replyToEmail",
      label: "Reply-to email",
      type: "string",
      hint: "Required when Reply-to name is set.",
    },
    { key: "replyToName", label: "Reply-to name", type: "string" },
    { key: "addNote", label: "Add a personal note to the verification email", type: "boolean" },
    { key: "personalNote", label: "Personal note", type: "text", hint: "Max 250 characters." },
  ],
  output: [{ key: "data", type: "object", label: "The created identity" }],

  execute(input, ctx) {
    return new MailerSendClient(ctx).json("/identities", {
      method: "POST",
      body: compact({
        domain_id: input.domainId,
        email: input.email,
        name: input.name,
        reply_to_email: input.replyToEmail,
        reply_to_name: input.replyToName,
        add_note: input.addNote,
        personal_note: input.personalNote,
      }),
    });
  },
};

export default createSenderIdentity;
