import type { ActionDefinition, FileRef } from "@w6w/types";
import { compact, parseJson, ZohoSignClient } from "../lib/client.ts";
import {
  emailRemindersParam,
  expirationDaysParam,
  folderIdParam,
  isSequentialParam,
  notesParam,
  reminderPeriodParam,
} from "../lib/params.ts";

interface Input {
  templateName: string;
  file: FileRef | string;
  actions: unknown;
  notes?: string;
  isSequential?: boolean;
  expirationDays?: number;
  emailReminders?: boolean;
  reminderPeriod?: number;
  folderId?: string;
}

/**
 * `POST /templates` — verified against `template-managment/create-template.html`. Same
 * `multipart/form-data` shape as `request-create` (a `file` part plus a plain-text `data`
 * part), but the recipients here are template **roles** (`role`) rather than fixed people —
 * `template-create-document` later fills in the actual name/email per role.
 */
const action: ActionDefinition<Input> = {
  key: "template-create",
  type: "perform",
  resource: "template",
  title: "Create Template",
  description: "Upload a document and define its recipient roles as a reusable template.",
  idempotent: false,
  params: [
    { key: "templateName", label: "Template Name", type: "string", required: true },
    {
      key: "file",
      label: "Document",
      type: "file",
      required: true,
      hint: "The document to use as the template — a FileRef from a prior step, or its bare id.",
    },
    {
      key: "actions",
      label: "Actions (roles)",
      type: "json",
      required: true,
      hint: 'JSON array of recipient roles, e.g. [{"action_type":"SIGN","role":"Signer 1",' +
        '"recipient_name":"","recipient_email":"","signing_order":0,"verify_recipient":true,' +
        '"verification_type":"EMAIL"}]. `role` is what Send Document Using Template later ' +
        "fills a real recipient into.",
    },
    notesParam,
    isSequentialParam,
    expirationDaysParam,
    emailRemindersParam,
    reminderPeriodParam,
    folderIdParam,
  ],
  output: [
    { key: "template_id", type: "string", label: "Template ID" },
    { key: "template_name", type: "string", label: "Template name" },
    { key: "document_ids", type: "array", label: "Uploaded documents" },
  ],

  async execute(input, ctx) {
    if (!ctx.file) {
      throw new Error(
        "template-create requires the host to support file storage (ctx.file), which this " +
          "host does not provide.",
      );
    }
    const actions = parseJson(input.actions, "actions");
    const { ref, bytes } = await ctx.file.read(input.file);

    const templates = compact({
      template_name: input.templateName,
      notes: input.notes,
      is_sequential: input.isSequential ?? true,
      expiration_days: input.expirationDays,
      email_reminders: input.emailReminders,
      reminder_period: input.reminderPeriod,
      folder_id: input.folderId,
      actions,
    });

    ctx.log("info", "creating a Zoho Sign template", { templateName: input.templateName });

    const body = await new ZohoSignClient(ctx).sendMultipartJson(
      "/templates",
      "POST",
      { templates },
      { filename: ref.filename, contentType: ref.contentType, bytes },
    );
    return body.templates ?? {};
  },
};

export default action;
