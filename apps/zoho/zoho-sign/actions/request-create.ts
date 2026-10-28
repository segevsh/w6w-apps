import type { ActionDefinition, FileRef } from "@w6w/types";
import { compact, parseJson, ZohoSignClient } from "../lib/client.ts";
import {
  actionsParam,
  emailRemindersParam,
  expirationDaysParam,
  folderIdParam,
  isSequentialParam,
  notesParam,
  reminderPeriodParam,
} from "../lib/params.ts";

interface Input {
  requestName: string;
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
 * `POST /requests` — verified against `document-managment/create-document.html`.
 *
 * Creates a **draft** signature request: uploads the document and records the recipients, but
 * does not send anything yet — nobody is emailed until `request-submit` runs. This two-step
 * shape (create, then submit) is how Zoho Sign's own "Getting started" guide sends a document.
 *
 * `multipart/form-data`: a `file` part (the document's bytes) and a `data` part carrying
 * `{"requests": {...}}` as plain-text JSON — NOT URL-encoded here, unlike `submit`/`update`.
 */
const action: ActionDefinition<Input> = {
  key: "request-create",
  type: "perform",
  resource: "request",
  title: "Create Document (Draft)",
  description:
    "Upload a document and record its recipients as a draft signature request. Nobody is " +
    "notified until Send Document For Signature runs.",
  idempotent: false,
  params: [
    { key: "requestName", label: "Request Name", type: "string", required: true },
    {
      key: "file",
      label: "Document",
      type: "file",
      required: true,
      hint: "The document to sign — a FileRef from a prior step, or its bare id.",
    },
    actionsParam(
      'JSON array of recipients, e.g. [{"action_type":"SIGN","recipient_name":"Alex James",' +
        '"recipient_email":"alex@example.com","signing_order":0,"verify_recipient":true,' +
        '"verification_type":"EMAIL"}]. `action_type` is one of SIGN | VIEW | INPERSONSIGN | ' +
        "APPROVER.",
    ),
    notesParam,
    isSequentialParam,
    expirationDaysParam,
    emailRemindersParam,
    reminderPeriodParam,
    folderIdParam,
  ],
  output: [
    { key: "request_id", type: "string", label: "Request ID" },
    { key: "request_status", type: "string", label: "Status (starts as draft)" },
    { key: "document_ids", type: "array", label: "Uploaded documents" },
    { key: "actions", type: "array", label: "Recorded recipients, with their action_id" },
  ],

  async execute(input, ctx) {
    if (!ctx.file) {
      throw new Error(
        "request-create requires the host to support file storage (ctx.file), which this " +
          "host does not provide.",
      );
    }
    const actions = parseJson(input.actions, "actions");
    const { ref, bytes } = await ctx.file.read(input.file);

    const requests = compact({
      request_name: input.requestName,
      notes: input.notes,
      is_sequential: input.isSequential ?? true,
      expiration_days: input.expirationDays,
      email_reminders: input.emailReminders,
      reminder_period: input.reminderPeriod,
      folder_id: input.folderId,
      actions,
    });

    ctx.log("info", "creating a Zoho Sign document draft", {
      requestName: input.requestName,
      recipients: Array.isArray(actions) ? actions.length : undefined,
    });

    const body = await new ZohoSignClient(ctx).sendMultipartJson(
      "/requests",
      "POST",
      { requests },
      { filename: ref.filename, contentType: ref.contentType, bytes },
    );
    return body.requests ?? {};
  },
};

export default action;
