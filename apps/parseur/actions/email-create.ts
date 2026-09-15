import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, ParseurClient } from "../lib/client.ts";

/**
 * `POST /email` — submit an email/text document directly, without going
 * through real email delivery.
 *
 * ## The mailbox's OWN address must appear in recipient/to/cc/bcc
 *
 * This is the single easiest way to lose a document silently: Parseur routes
 * a posted "email" to a mailbox by matching its address
 * (`{email_prefix}@{email_domain}`, e.g. `acme@in.parseur.com`) against
 * `recipient`, `to`, `cc` **or** `bcc`. The vendor's own guide states it
 * plainly: "your mailbox address must appear in at least one of recipient,
 * to, cc, or bcc." Posting to an arbitrary address is accepted (`201`,
 * `{"message":"OK"}`) but the document goes nowhere — use `mailbox-get`'s
 * `email_prefix` plus `bootstrap-get`'s `email_domain` to build the address.
 *
 * ## Asynchronous
 *
 * A `201` means the payload was accepted, not that it has been parsed yet —
 * same caveat as `document-upload.ts`.
 */
interface Input {
  subject: string;
  from: string;
  recipient: string;
  to?: string;
  cc?: string;
  bcc?: string;
  bodyHtml?: string;
  bodyPlain?: string;
  messageHeaders?: unknown;
  customParams?: unknown;
}

interface EmailCreateResponse {
  message?: string;
}

/** `{"X-Header": "value"}` -> `[["X-Header", "value"], ...]`, the wire shape the API documents. */
export function toMessageHeaderPairs(
  headers: Record<string, unknown> | undefined,
): Array<[string, string]> | undefined {
  if (!headers) return undefined;
  const pairs = Object.entries(headers).map(([k, v]) => [k, String(v)] as [string, string]);
  return pairs.length > 0 ? pairs : undefined;
}

const emailCreate: ActionDefinition<Input> = {
  key: "email-create",
  type: "perform",
  resource: "document",
  title: "Submit Email Document",
  description:
    "Submit an email/text payload as a new document, without sending real email. The target " +
    "mailbox's own address must appear in Recipient, To, Cc, or Bcc — see the action's notes.",
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      placeholder: "Sender Name <sender@example.com>",
    },
    {
      key: "recipient",
      label: "Recipient",
      type: "string",
      required: true,
      placeholder: "mailbox-prefix@<inbound-email-domain>",
      hint: "Must be the target mailbox's own inbound address (see bootstrap-get's email_domain " +
        "and the mailbox's own email_prefix), or set it in To/Cc/Bcc instead.",
    },
    { key: "to", label: "To", type: "string" },
    { key: "cc", label: "Cc", type: "string" },
    { key: "bcc", label: "Bcc", type: "string" },
    {
      key: "bodyHtml",
      label: "Body (HTML)",
      type: "text",
      hint: "Takes priority over Body (text) if both are set.",
    },
    {
      key: "bodyPlain",
      label: "Body (text)",
      type: "text",
      hint: "Used only when Body (HTML) is empty.",
    },
    {
      key: "messageHeaders",
      label: "Message headers",
      type: "json",
      hint: 'Object of raw SMTP-style headers, e.g. {"X-Envelope-From": "sender@corp.example"}.',
    },
    {
      key: "customParams",
      label: "Custom parameters",
      type: "json",
      hint: "Object merged into the parsed result once processing finishes, sent as query-string " +
        'parameters, e.g. {"user.name": "John"}.',
    },
  ],
  output: [{ key: "message", type: "string", label: 'Vendor acknowledgement ("OK")' }],

  execute(input, ctx) {
    const headers = asOptionalJson<Record<string, unknown>>(
      input.messageHeaders,
      "Message headers",
    );
    const custom = asOptionalJson<Record<string, unknown>>(input.customParams, "Custom parameters");
    const query: Record<string, string | string[]> = {};
    if (custom) {
      for (const [key, value] of Object.entries(custom)) {
        if (value === undefined || value === null) continue;
        query[key] = Array.isArray(value) ? value.map(String) : String(value);
      }
    }

    return new ParseurClient(ctx).request<EmailCreateResponse>("/email", {
      method: "POST",
      query,
      body: compact({
        subject: input.subject,
        from: input.from,
        recipient: input.recipient,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        body_html: input.bodyHtml,
        body_plain: input.bodyPlain,
        message_headers: toMessageHeaderPairs(headers),
      }),
    });
  },
};

export default emailCreate;
