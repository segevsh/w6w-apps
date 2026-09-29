import type { ActionDefinition } from "@w6w/types";
import { asJson, asJsonOptional, compact, DocuSealClient } from "../lib/client.ts";

/**
 * `POST /submissions/pdf` — verified against DocuSeal's OpenAPI document
 * (`createSubmissionFromPdf`, `CreateSubmissionFromPdfRequest`). Creates a
 * one-off submission directly from PDF files rather than a saved template —
 * each document needs `name` and `file` (base64-encoded content, or a
 * downloadable URL), and fields are optional if the PDF already carries
 * `{{...}}` text tags. Not idempotent — a retry creates a second submission.
 */
const submissionCreateFromPdf: ActionDefinition = {
  key: "submission-create-from-pdf",
  type: "perform",
  resource: "submission",
  title: "Create Submission From PDF",
  description: "Send a one-off signature request built directly from PDF files.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", default: "" },
    {
      key: "documents",
      label: "Documents",
      type: "json",
      required: true,
      hint: 'A JSON array of {"name": "...", "file": "<base64 or URL>", "fields": [...]}.',
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
      hint: "A JSON array of template ids to include alongside the PDFs, for a multi-document " +
        "submission.",
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
    {
      key: "flatten",
      label: "Flatten",
      type: "boolean",
      default: false,
      hint: "Remove PDF form fields from the documents.",
    },
    { key: "mergeDocuments", label: "Merge Into One PDF", type: "boolean", default: false },
    {
      key: "removeTags",
      label: "Remove {{Text}} Tags",
      type: "boolean",
      default: true,
      hint: "Disable to keep transparent {{text}} tags for faster, more robust processing.",
    },
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

    ctx.log("info", "creating a DocuSeal submission from PDF", {
      documentCount: documents.length,
      submitterCount: submitters.length,
    });

    return await new DocuSealClient(ctx).request("/submissions/pdf", {
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
        flatten: p.flatten === true ? true : undefined,
        merge_documents: p.mergeDocuments === true ? true : undefined,
        remove_tags: p.removeTags === false ? false : undefined,
      }),
    });
  },
};

export default submissionCreateFromPdf;
