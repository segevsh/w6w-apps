import type { ActionDefinition } from "@w6w/types";
import { compact, PandaDocClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  status: number;
  note?: string;
  notifyRecipients?: boolean;
}

/**
 * `PATCH /public/v1/documents/{id}/status` — manually move a document to a
 * terminal-ish state.
 *
 * Only four target codes are accepted, and they are the *numeric* form (the
 * same integer vocabulary the list endpoint filters on, not the
 * `document.completed` strings):
 *
 *   - `2`  Completed
 *   - `10` Paid — requires a payment app connected to the workspace
 *   - `11` Expired
 *   - `12` Declined
 *
 * Not every transition is legal — PandaDoc maintains a transition matrix and
 * answers `409` for a move it does not allow (its own example: Expired → Paid
 * is fine, Paid → Expired is not). A `423` means the document is locked because
 * someone has it open in the editor. Both surface as errors rather than being
 * retried.
 *
 * Success is `204 No Content`, so this action returns the status it set rather
 * than a body PandaDoc did not send.
 */
const documentChangeStatus: ActionDefinition<Input> = {
  key: "document-change-status",
  type: "perform",
  resource: "document",
  title: "Change Document Status",
  description:
    "Manually mark a document Completed (2), Paid (10), Expired (11) or Declined (12). Illegal transitions answer 409.",
  // `notify_recipients` emails people, and a repeat call is a 409 rather than a
  // no-op, so this is not safe to retry blindly.
  idempotent: false,
  params: [
    documentIdParam,
    {
      key: "status",
      label: "New status",
      type: "select",
      required: true,
      hint: "PandaDoc accepts only these four targets on this route.",
      options: [
        { value: 2, label: "Completed (2)" },
        { value: 10, label: "Paid (10) — needs a connected payment app" },
        { value: 11, label: "Expired (11)" },
        { value: 12, label: "Declined (12)" },
      ],
    },
    { key: "note", label: "Note", type: "text", hint: "Recorded against the status change." },
    {
      key: "notifyRecipients",
      label: "Notify recipients",
      type: "boolean",
      hint: "Email the recipients about the change. Sent as `notify_recipients`.",
    },
  ],
  output: [
    { key: "documentId", type: "string", label: "Document ID" },
    { key: "status", type: "number", label: "Status that was set" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "changing PandaDoc document status", {
      documentId: input.documentId,
      status: input.status,
    });
    const body = compact({
      status: input.status,
      note: input.note,
      notify_recipients: input.notifyRecipients,
    });
    await new PandaDocClient(ctx).request(
      `/documents/${encodeURIComponent(input.documentId)}/status`,
      { method: "PATCH", body },
    );
    // 204 No Content — echo the request rather than invent a response body.
    return { documentId: input.documentId, status: input.status };
  },
};

export default documentChangeStatus;
