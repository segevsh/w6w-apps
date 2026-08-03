import type { ActionDefinition } from "@w6w/types";
import {
  MailjetClient,
  type MailjetEnvelope,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  email?: string;
  isDefaultSender?: boolean;
  status?: string;
}

export interface MailjetSender {
  ID?: number;
  Email?: string;
  Name?: string;
  Status?: string;
  IsDefaultSender?: boolean;
  CreatedAt?: string;
  DNSID?: number;
  EmailType?: string;
  Filename?: string;
}

/**
 * List the sender addresses and domains registered on this API key.
 *
 * This exists to make the most common send failure diagnosable. Mailjet refuses
 * any send whose `From` is not a validated sender — its send guide opens with
 * "Verify a Sender" as a hard requirement: "An e-mail address or a complete
 * domain has to be registered and validated before being used to send e-mails."
 * A workflow that sends from an unvalidated address fails at `send-email` with a
 * vendor error, and this is how you check the address before or after the fact
 * rather than guessing in the web UI.
 *
 * Registration is deliberately **not** implemented — `POST /v3/REST/sender`
 * exists, but adding a sender only starts a validation flow that completes out of
 * band (a confirmation email, or a DNS record for a whole domain). An action that
 * appears to add a sender but leaves it unusable until a human acts is worse than
 * no action; see README.md "Not built".
 */
const listSenders: ActionDefinition<Input> = {
  key: "list-senders",
  type: "read",
  resource: "sender",
  title: "List Senders",
  description:
    "List validated sender addresses and domains (GET /v3/REST/sender). Mailjet rejects any " +
    "send whose `From` is not validated — this is how to check.",
  params: [
    { key: "email", label: "Email", type: "string", hint: "Filter to one address." },
    {
      key: "isDefaultSender",
      label: "Default sender only",
      type: "boolean",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Mailjet's validation status, e.g. `Active`, `Inactive`, `Deleted`.",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "Data", type: "array", label: "Senders" },
    { key: "Count", type: "number", label: "Count" },
    { key: "Total", type: "number", label: "Total" },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    return client.v3<MailjetEnvelope<MailjetSender>>("/sender", {
      query: {
        ...pageQuery(input),
        Email: input.email,
        IsDefaultSender: input.isDefaultSender,
        Status: input.status,
      },
    });
  },
};

export default listSenders;
