import type { ActionDefinition } from "@w6w/types";
import { PandaDocClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
}

/**
 * `GET /public/v1/documents/{id}` — the cheap status read, and the one this app
 * exists to make easy.
 *
 * **This is the poll half of PandaDoc's asynchronous document creation.**
 * `document-create-from-template` returns `document.uploaded`, not a usable
 * document: PandaDoc processes the template merge in the background and the
 * document is only sendable once it reaches `document.draft`. The creation
 * response even says so in an `info_message` field — *"Poll Document Status
 * until status changes to document.draft"*. That poll is this action. Put it in
 * a wait/retry loop between Create and Send; PandaDoc's own guidance is that
 * the transition typically takes 3–5 seconds, but that is an observation, not a
 * guarantee, and `document.error` is a real terminal outcome.
 *
 * The documented status vocabulary, in the order a document generally moves
 * through it:
 *
 *   `document.uploaded` → `document.draft` → `document.sent` → `document.viewed`
 *   → `document.completed`
 *
 * with `document.error` (creation failed — terminal), `document.scheduled`
 * (draft queued to send later), `document.waiting_approval` / `document.approved`
 * / `document.rejected` (approval workflow), `document.waiting_pay` /
 * `document.paid` (Stripe), `document.external_review` (Suggest Edit), and the
 * terminal `document.voided` and `document.declined`.
 *
 * Prefer this over `document-get` when all you need is the state: it is a
 * far smaller response and sits in PandaDoc's 2000 req/min bucket rather than
 * Document Details' 600.
 */
const documentGetStatus: ActionDefinition<Input> = {
  key: "document-get-status",
  type: "read",
  resource: "document",
  title: "Get Document Status",
  description:
    "Read a document's current status. Poll this after Create Document until the status reaches `document.draft` — creation is asynchronous.",
  params: [documentIdParam],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status (e.g. document.draft)" },
    { key: "date_created", type: "string", label: "Created at" },
    { key: "date_modified", type: "string", label: "Modified at" },
    { key: "expiration_date", type: "string", label: "Expires at" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    return await new PandaDocClient(ctx).request(
      `/documents/${encodeURIComponent(input.documentId)}`,
    );
  },
};

export default documentGetStatus;
