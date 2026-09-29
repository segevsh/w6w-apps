import type { ActionDefinition } from "@w6w/types";
import { asJson, asJsonOptional, compact, DocuSealClient } from "../lib/client.ts";

/**
 * `POST /submissions` — verified against DocuSeal's OpenAPI document
 * (`createSubmission`, `CreateSubmissionRequest`). Sends an existing
 * template out for signature. `submitters` is a JSON array of
 * `{name, role, email, phone, values, fields, ...}` — one entry per signer;
 * see the DocuSeal API docs for the full per-submitter shape
 * (`CreateSubmissionSubmitterParams`).
 *
 * `order` controls whether every submitter is emailed right away
 * (`random`) or only after the previous one signs (`preserved`, the
 * vendor's own default — matched here rather than left to the API, so the
 * action's declared default is honest about what happens with no input).
 *
 * Not idempotent: a retry creates a second submission and, unless
 * `sendEmail` is false, sends a second round of signature request emails.
 */
const submissionCreate: ActionDefinition = {
  key: "submission-create",
  type: "perform",
  resource: "submission",
  title: "Create a Submission",
  description: "Send an existing template out for signature to one or more submitters.",
  idempotent: false,
  params: [
    { key: "templateId", label: "Template ID", type: "number", required: true },
    {
      key: "submitters",
      label: "Submitters",
      type: "json",
      required: true,
      hint: 'A JSON array, e.g. [{"role":"First Party","email":"a@example.com"}]. Each entry ' +
        "may carry name, role, email, phone, values, fields, externalId, metadata, and more — " +
        "see the DocuSeal API docs for the full shape.",
    },
    {
      key: "sendEmail",
      label: "Send Email",
      type: "boolean",
      default: true,
      hint: "Disable to skip signature request emails entirely.",
    },
    {
      key: "sendSms",
      label: "Send SMS",
      type: "boolean",
      default: false,
      hint: "Send the signature request via phone number and SMS as well.",
    },
    {
      key: "order",
      label: "Submitter Order",
      type: "select",
      default: "preserved",
      options: [
        {
          value: "preserved",
          label: "Preserved — each party is emailed only after the previous one signs",
        },
        { value: "random", label: "Random — every party is emailed right away" },
      ],
    },
    { key: "completedRedirectUrl", label: "Completed Redirect URL", type: "string", default: "" },
    { key: "bccCompleted", label: "BCC on Completion", type: "string", default: "" },
    { key: "replyTo", label: "Reply-To", type: "string", default: "" },
    {
      key: "expireAt",
      label: "Expires At",
      type: "string",
      default: "",
      hint: "e.g. 2024-09-01 12:00:00 UTC.",
    },
    {
      key: "variables",
      label: "Variables",
      type: "json",
      default: "",
      hint: "A JSON object of dynamic content variables for dynamic template documents.",
    },
    {
      key: "message",
      label: "Custom Email Message",
      type: "json",
      default: "",
      hint: 'A JSON object {"subject": "...", "body": "..."}.',
    },
  ],
  output: [{ key: "[]", type: "array", label: "The created submitters, one per signer" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const templateId = Number(p.templateId);
    if (!Number.isFinite(templateId)) {
      throw new Error("`templateId` is required and must be a number.");
    }
    const submitters = asJson<unknown[]>(p.submitters, "submitters");
    if (submitters.length === 0) throw new Error("`submitters` must contain at least one entry.");

    ctx.log("info", "creating a DocuSeal submission", {
      templateId,
      submitterCount: submitters.length,
    });

    return await new DocuSealClient(ctx).request("/submissions", {
      method: "POST",
      body: compact({
        template_id: templateId,
        submitters,
        send_email: p.sendEmail === false ? false : undefined,
        send_sms: p.sendSms === true ? true : undefined,
        order: p.order && p.order !== "preserved" ? p.order : undefined,
        completed_redirect_url: p.completedRedirectUrl,
        bcc_completed: p.bccCompleted,
        reply_to: p.replyTo,
        expire_at: p.expireAt,
        variables: asJsonOptional<Record<string, unknown>>(p.variables, "variables"),
        message: asJsonOptional<Record<string, unknown>>(p.message, "message"),
      }),
    });
  },
};

export default submissionCreate;
