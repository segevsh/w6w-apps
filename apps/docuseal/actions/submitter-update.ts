import type { ActionDefinition } from "@w6w/types";
import { asJsonOptional, compact, DocuSealClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `PUT /submitters/{id}` — verified against DocuSeal's OpenAPI document
 * (`updateSubmitter`, `UpdateSubmitterRequest`). Corrects a submitter's
 * contact details, pre-fills their field values, re-sends their invite, or
 * marks them completed/auto-signed on their behalf via `completed: true`.
 * Applying the same correction twice leaves the submitter in the same state,
 * so this is treated as idempotent — except that `sendEmail`/`sendSms` set
 * to true re-sends a live notification on every call, which a caller relying
 * on idempotent retries should leave unset.
 */
const submitterUpdate: ActionDefinition = {
  key: "submitter-update",
  type: "perform",
  resource: "submitter",
  title: "Update a Submitter",
  description: "Update a submitter's contact details or field values, or re-send their invite.",
  idempotent: true,
  params: [
    idParam("Submitter ID"),
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "email", label: "Email", type: "string", default: "" },
    { key: "phone", label: "Phone", type: "string", default: "", hint: "E.164 format." },
    {
      key: "values",
      label: "Field Values",
      type: "json",
      default: "",
      hint: 'A JSON object of field name -> value, e.g. {"Full Name": "John Doe"}.',
    },
    { key: "externalId", label: "External ID", type: "string", default: "" },
    {
      key: "sendEmail",
      label: "Re-send Email",
      type: "boolean",
      default: "",
      hint: "Set true to re-send the signature request email.",
    },
    {
      key: "sendSms",
      label: "Re-send SMS",
      type: "boolean",
      default: false,
    },
    { key: "replyTo", label: "Reply-To", type: "string", default: "" },
    {
      key: "completed",
      label: "Mark Completed",
      type: "boolean",
      default: "",
      hint: "Set true to mark this submitter completed and auto-signed via the API.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      default: "",
      hint: 'A JSON object of additional submitter information, e.g. {"customField": "value"}.',
    },
    { key: "completedRedirectUrl", label: "Completed Redirect URL", type: "string", default: "" },
    {
      key: "requirePhone2fa",
      label: "Require Phone 2FA",
      type: "boolean",
      default: false,
    },
    {
      key: "requireEmail2fa",
      label: "Require Email 2FA",
      type: "boolean",
      default: false,
    },
    {
      key: "message",
      label: "Custom Email Message",
      type: "json",
      default: "",
      hint: 'A JSON object {"subject": "...", "body": "..."}.',
    },
    {
      key: "fields",
      label: "Field Configurations",
      type: "json",
      default: "",
      hint: 'A JSON array of per-field configuration, e.g. [{"name":"Full Name","readonly":true}].',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Submitter id" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "This submitter's own status" },
    { key: "embed_src", type: "string", label: "The src URL to embed the signing form" },
    { key: "values", type: "array", label: "Pre-filled field values" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.id);
    if (!Number.isFinite(id)) throw new Error("`id` is required and must be a number.");

    ctx.log("info", "updating a DocuSeal submitter", { id });

    return await new DocuSealClient(ctx).request(`/submitters/${id}`, {
      method: "PUT",
      body: compact({
        name: p.name,
        email: p.email,
        phone: p.phone,
        values: asJsonOptional<Record<string, unknown>>(p.values, "values"),
        external_id: p.externalId,
        send_email: typeof p.sendEmail === "boolean" ? p.sendEmail : undefined,
        send_sms: p.sendSms === true ? true : undefined,
        reply_to: p.replyTo,
        completed: typeof p.completed === "boolean" ? p.completed : undefined,
        metadata: asJsonOptional<Record<string, unknown>>(p.metadata, "metadata"),
        completed_redirect_url: p.completedRedirectUrl,
        require_phone_2fa: p.requirePhone2fa === true ? true : undefined,
        require_email_2fa: p.requireEmail2fa === true ? true : undefined,
        message: asJsonOptional<Record<string, unknown>>(p.message, "message"),
        fields: asJsonOptional<unknown[]>(p.fields, "fields"),
      }),
    });
  },
};

export default submitterUpdate;
