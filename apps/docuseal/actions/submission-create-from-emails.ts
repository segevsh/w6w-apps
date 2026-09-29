import type { ActionDefinition } from "@w6w/types";
import { asJsonOptional, compact, DocuSealClient } from "../lib/client.ts";

/**
 * `POST /submissions/emails` — verified against DocuSeal's OpenAPI document
 * (`createSubmissionsFromEmails`, `CreateSubmissionsFromEmailsRequest`). The
 * quick path: one template, a comma-separated list of email addresses, one
 * one-off submission created per address. Not idempotent — a retry emails
 * everyone a second time unless `sendEmail` is false.
 */
const submissionCreateFromEmails: ActionDefinition = {
  key: "submission-create-from-emails",
  type: "perform",
  resource: "submission",
  title: "Create Submissions From Emails",
  description:
    "Send a template's signature request to a list of email addresses, one submission per address.",
  idempotent: false,
  params: [
    { key: "templateId", label: "Template ID", type: "number", required: true },
    {
      key: "emails",
      label: "Emails",
      type: "string",
      required: true,
      hint: "A comma-separated list of email addresses.",
    },
    {
      key: "sendEmail",
      label: "Send Email",
      type: "boolean",
      default: true,
      hint: "Disable to create the submissions without sending signature request emails.",
    },
    {
      key: "message",
      label: "Custom Email Message",
      type: "json",
      default: "",
      hint: 'A JSON object {"subject": "...", "body": "..."}.',
    },
  ],
  output: [{ key: "[]", type: "array", label: "The created submitters, one per email" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const templateId = Number(p.templateId);
    if (!Number.isFinite(templateId)) {
      throw new Error("`templateId` is required and must be a number.");
    }
    const emails = String(p.emails ?? "").trim();
    if (!emails) throw new Error("`emails` is required.");

    ctx.log("info", "creating DocuSeal submissions from emails", { templateId });

    return await new DocuSealClient(ctx).request("/submissions/emails", {
      method: "POST",
      body: compact({
        template_id: templateId,
        emails,
        send_email: p.sendEmail === false ? false : undefined,
        message: asJsonOptional<Record<string, unknown>>(p.message, "message"),
      }),
    });
  },
};

export default submissionCreateFromEmails;
