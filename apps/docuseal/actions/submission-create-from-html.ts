import type { ActionDefinition } from "@w6w/types";
import { asJson, asJsonOptional, compact, DocuSealClient } from "../lib/client.ts";

/**
 * `POST /submissions/html` — verified against DocuSeal's OpenAPI document
 * (`createSubmissionFromHtml`, `CreateSubmissionFromHtmlRequest`). Creates a
 * one-off submission directly from HTML fragments carrying DocuSeal's field
 * tags, without saving a reusable template first. Not idempotent — a retry
 * creates a second submission.
 */
const submissionCreateFromHtml: ActionDefinition = {
  key: "submission-create-from-html",
  type: "perform",
  resource: "submission",
  title: "Create Submission From HTML",
  description:
    "Send a one-off signature request built directly from HTML documents with field tags.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", default: "" },
    {
      key: "documents",
      label: "Documents",
      type: "json",
      required: true,
      hint: 'A JSON array of {"name": "...", "html": "<p>... <text-field .../></p>"}. Can hold ' +
        "several entries to build a multi-document submission.",
    },
    {
      key: "submitters",
      label: "Submitters",
      type: "json",
      required: true,
      hint: 'A JSON array, e.g. [{"role":"First Party","email":"a@example.com"}].',
    },
    {
      key: "templateIds",
      label: "Additional Template IDs",
      type: "json",
      default: "",
      hint: "A JSON array of template ids to include alongside the HTML documents.",
    },
    { key: "sendEmail", label: "Send Email", type: "boolean", default: true },
    { key: "sendSms", label: "Send SMS", type: "boolean", default: false },
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
    { key: "expireAt", label: "Expires At", type: "string", default: "" },
    {
      key: "message",
      label: "Custom Email Message",
      type: "json",
      default: "",
      hint: 'A JSON object {"subject": "...", "body": "..."}.',
    },
    { key: "mergeDocuments", label: "Merge Into One PDF", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "number", label: "New submission id" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Whole-submission status" },
    { key: "submitters", type: "array", label: "The created submitters" },
    { key: "created_at", type: "string", label: "Created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const documents = asJson<unknown[]>(p.documents, "documents");
    const submitters = asJson<unknown[]>(p.submitters, "submitters");
    if (submitters.length === 0) throw new Error("`submitters` must contain at least one entry.");

    ctx.log("info", "creating a DocuSeal submission from HTML", {
      documentCount: documents.length,
      submitterCount: submitters.length,
    });

    return await new DocuSealClient(ctx).request("/submissions/html", {
      method: "POST",
      body: compact({
        name: p.name,
        documents,
        submitters,
        template_ids: asJsonOptional<number[]>(p.templateIds, "templateIds"),
        send_email: p.sendEmail === false ? false : undefined,
        send_sms: p.sendSms === true ? true : undefined,
        order: p.order && p.order !== "preserved" ? p.order : undefined,
        completed_redirect_url: p.completedRedirectUrl,
        bcc_completed: p.bccCompleted,
        reply_to: p.replyTo,
        expire_at: p.expireAt,
        message: asJsonOptional<Record<string, unknown>>(p.message, "message"),
        merge_documents: p.mergeDocuments === true ? true : undefined,
      }),
    });
  },
};

export default submissionCreateFromHtml;
