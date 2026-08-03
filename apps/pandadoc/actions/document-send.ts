import type { ActionDefinition } from "@w6w/types";
import { compact, PandaDocClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  subject?: string;
  message?: string;
  silent?: boolean;
  sender?: unknown;
  replyTo?: string;
  forwardingSettings?: unknown;
}

/**
 * `POST /public/v1/documents/{id}/send` — move a draft to `document.sent` and
 * email the recipients their signing links.
 *
 * **Precondition: the document must already be in `document.draft`.** A
 * document that has just been created is in `document.uploaded` and this call
 * will not accept it — see `document-create-from-template` for why, and poll
 * `document-get-status` in between. This is the single most common way a
 * create-then-send workflow fails, and it fails intermittently (a fast merge
 * looks like it works), which is worse than failing every time.
 *
 * `silent: true` sends the document without emailing anyone — the document
 * still moves to `document.sent` and each recipient still gets a shared link in
 * the response, which is what you want when your own system is delivering the
 * link.
 */
const documentSend: ActionDefinition<Input> = {
  key: "document-send",
  type: "perform",
  resource: "document",
  title: "Send Document",
  description:
    "Send a document for signature. The document must already be in `document.draft` — poll Get Document Status first if it was just created.",
  // Re-sending an already-sent document is not a no-op: PandaDoc emails the
  // recipients again. Never silently retried.
  idempotent: false,
  params: [
    documentIdParam,
    { key: "subject", label: "Email subject", type: "string" },
    {
      key: "message",
      label: "Email message",
      type: "text",
      hint: "Body of the email that carries the signing link.",
    },
    {
      key: "silent",
      label: "Silent",
      type: "boolean",
      hint:
        "Send without emailing recipients. The document still moves to `document.sent` and the response still carries each recipient's shared link.",
    },
    {
      key: "sender",
      label: "Sender",
      type: "json",
      hint:
        'Send on another member\'s behalf, e.g. {"email":"rep@acme.com"} or {"membership_id":"..."}.',
    },
    { key: "replyTo", label: "Reply-to", type: "string", hint: "Sent as `reply_to`." },
    {
      key: "forwardingSettings",
      label: "Forwarding settings",
      type: "json",
      hint:
        'e.g. {"forwarding_allowed":true,"forwarding_with_reassigning_allowed":false}. Sent as `forwarding_settings`.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status — `document.sent` on success" },
    { key: "date_sent", type: "string", label: "Sent at" },
    { key: "expiration_date", type: "string", label: "Expires at" },
    { key: "recipients", type: "array", label: "Recipients, each with its shared link" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "sending PandaDoc document", { documentId: input.documentId });
    const body = compact({
      subject: input.subject,
      message: input.message,
      silent: input.silent,
      sender: input.sender,
      reply_to: input.replyTo,
      forwarding_settings: input.forwardingSettings,
    });
    return await new PandaDocClient(ctx).request(
      `/documents/${encodeURIComponent(input.documentId)}/send`,
      { method: "POST", body },
    );
  },
};

export default documentSend;
