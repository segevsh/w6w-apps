import type { ActionDefinition } from "@w6w/types";
import { PandaDocClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  reminders: unknown;
}

/**
 * `POST /public/v1/documents/{document_id}/send-reminder` — nudge recipients
 * who have not finished.
 *
 * This is the *manual* reminder. PandaDoc separately has automatic reminder
 * settings on a document (`.../auto-reminder-settings`), which are
 * configuration rather than an action and are not exposed here.
 *
 * `reminders` is an array because the call is per-recipient: each entry names a
 * `recipient_id` (from `document-get`'s recipients) and the
 * `delivery_methods` to use, optionally with an `email_customization` subject
 * and message. The response reports per-recipient, per-channel outcomes — a
 * partial failure comes back as `200` with `status: "error"` on the failed
 * channel, not as an HTTP error, so read `result` rather than assuming success.
 *
 * `409` means the document is in a state that cannot be reminded about: never
 * sent, already in a final state, or in suggesting mode.
 */
const documentSendReminder: ActionDefinition<Input> = {
  key: "document-send-reminder",
  type: "perform",
  resource: "document",
  title: "Send Manual Reminder",
  description:
    "Send a manual reminder to one or more of a document's recipients. Reports per-recipient, per-channel outcomes.",
  // Every call sends another email/SMS.
  idempotent: false,
  params: [
    documentIdParam,
    {
      key: "reminders",
      label: "Reminders",
      type: "json",
      required: true,
      hint:
        'Array of per-recipient reminders, e.g. [{"recipient_id":"...","delivery_methods":{"email":true,"sms":false},' +
        '"email_customization":{"subject":"Still waiting","message":"Please sign."}}]. ' +
        "Recipient ids come from Get Document Details. Subject max 512 chars, message max 5000 (Markdown).",
    },
  ],
  output: [
    {
      key: "result",
      type: "array",
      label: "Per-recipient outcomes (email/sms status, sent_at, detail)",
    },
  ],

  async execute(input, ctx) {
    ctx.log("info", "sending PandaDoc reminder", { documentId: input.documentId });
    return await new PandaDocClient(ctx).request(
      `/documents/${encodeURIComponent(input.documentId)}/send-reminder`,
      { method: "POST", body: { reminders: input.reminders } },
    );
  },
};

export default documentSendReminder;
