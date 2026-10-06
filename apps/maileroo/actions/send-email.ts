import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, need } from "../lib/client.ts";
import { commonBody, type CommonInput, P } from "../lib/mail.ts";

interface Input extends CommonInput {
  html?: string;
  plain?: string;
}

/**
 * `POST /api/v2/emails` on the Email API (sending key). Either `html` or `plain` is required;
 * when only `html` is given Maileroo derives a plain-text part itself. Not idempotent: a retry
 * sends a second email (the vendor documents no de-duplication on `reference_id`).
 */
const sendEmail: ActionDefinition<Input> = {
  key: "send-email",
  type: "perform",
  idempotent: false,
  resource: "email",
  title: "Send Email",
  description: "Send a transactional email (HTML and/or plain text) through the Maileroo Email " +
    "API, optionally scheduled up to 21 days ahead. Needs the connection's Sending Key.",
  params: [
    ...P.FROM,
    ...P.RECIPIENTS,
    P.SUBJECT,
    {
      key: "html",
      label: "HTML body",
      type: "text",
      hint: "Either HTML or plain text is required.",
    },
    {
      key: "plain",
      label: "Plain-text body",
      type: "text",
      hint: "When empty and HTML is set, Maileroo generates one from the HTML.",
    },
    P.TRACKING,
    P.TAGS,
    P.HEADERS,
    P.ATTACHMENTS,
    P.SCHEDULED,
    P.REF,
  ],
  output: [
    { key: "referenceId", type: "string", label: "Reference ID (24-char hex) of the queued email" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const body = commonBody(input);
    const html = input.html ? String(input.html) : undefined;
    const hasPlain = input.plain !== undefined && input.plain !== null;
    if (!html && !String(input.plain ?? "").trim()) {
      throw new Error("html or plain is required");
    }
    if (html) body.html = html;
    if (hasPlain && String(input.plain).length) body.plain = String(input.plain);
    need(body.subject, "subject");
    const { data, body: raw } = await new MailerooClient(ctx).send("/emails", { body });
    return {
      referenceId: (data as { reference_id?: string } | undefined)?.reference_id,
      message: (raw as { message?: string } | undefined)?.message,
    };
  },
};

export default sendEmail;
