/**
 * Documenso — send envelopes for signature, manage the recipients and fields on
 * them, and read the audit trail that makes a signature defensible.
 *
 * Every path, parameter, required body field and response shape was taken from
 * the OpenAPI 3.0.3 document Documenso serves from its own app host
 * (`https://app.documenso.com/api/v2/openapi.json`, 89 paths, fetched
 * 2026-08-18), and the auth and rate-limit behaviour was measured against the
 * same host.
 *
 * ## Three generations of API, and only one of them is current
 *
 * This is the first thing to get right, and the easiest to get wrong:
 *
 *   - **v1** (`/api/v1/*`) — every operation in its own document is marked
 *     *"This endpoint is deprecated, but will continue to be supported"*. It is
 *     also what most tutorials still show.
 *   - **v2's `/document/*` and `/template/*`** — **52 of v2's 89 operations**
 *     are deprecated too, each pointing at the same migration guide:
 *     *"this endpoint is being replaced by the Envelope API"*.
 *   - **v2's `/envelope/*`** — 31 operations, none deprecated.
 *
 * This app uses only the envelope model. An **envelope** is the unit of
 * signing: it holds the documents, the recipients, the fields placed on them
 * and the audit trail together. A "document" in the old model was one envelope
 * with one file, and a "template" is an envelope with `type: TEMPLATE` — which
 * is why templates show up in an unfiltered envelope list, and why
 * `envelope-find` defaults to documents.
 *
 * ## Creating something to sign
 *
 * `POST /envelope/create` takes `multipart/form-data` with a PDF, and an App
 * runs in a sandbox with no local file to attach — so creating an envelope from
 * scratch is out of scope, the same call this pack's `dropbox-sign` app makes
 * about its multipart path.
 *
 * `envelope-use` is the route that works: it fills a **template** envelope's
 * recipient placeholders and produces a real envelope. That request is
 * multipart too, but its `files` part is optional, so this app sends only the
 * JSON `payload` field and lets the template supply its own PDFs. The
 * content-type header is deliberately left to the runtime, because a multipart
 * body needs a boundary a hand-written header would not have.
 *
 * It is also the better pattern: the document is authored and versioned in
 * Documenso rather than assembled by a workflow step.
 *
 * ## Four things that go wrong quietly
 *
 *   - **Nothing is sent until `envelope-distribute`.** Creating an envelope,
 *     adding recipients and placing fields are all silent. A workflow that
 *     "sent" a contract without this call has a draft nobody can see.
 *   - **The envelope's `status` is not one person's status.** It reaches
 *     `COMPLETED` only when *every* recipient has signed, so polling it to find
 *     out whether Ada signed waits for the slowest signer.
 *     `envelope-recipient-get` answers the real question.
 *   - **Field positions are percentages of the page, not pixels.** `pageX`,
 *     `pageY`, `width` and `height` are all 0–100, and a pixel coordinate lands
 *     somewhere absurd rather than failing. This app rejects a value over 100
 *     with an error that says why.
 *   - **A missing API key is a `400`, not a `401`.** The `Authorization` header
 *     is a declared parameter rather than a security layer, so no credential
 *     reads as a malformed request with a Zod validation tree. `test` names
 *     that case specifically.
 *
 * ## Cancel keeps the evidence; delete does not
 *
 * Cancelling stops a pending envelope and leaves it, with its audit trail, in
 * the account. Deleting removes both — and for a signed document the audit
 * trail *is* the evidence, the part a copy of the PDF does not carry. So
 * `envelope-delete` requires an explicit confirmation and points at cancel.
 *
 * Deliberately out of scope:
 *   - **The deprecated `/document/*` and `/template/*` surfaces**, for the
 *     reason above.
 *   - **Uploading PDFs** — `envelope/create`, `envelope/item/create-many` and
 *     the attachment endpoints all move bytes the sandbox cannot produce.
 *   - **Embedding presign tokens** — they exist to let a browser sign inside
 *     your own page, which is a front-end concern rather than a workflow step.
 *   - **Direct links** — a public URL anyone can use to start a signature is a
 *     sharing decision, not an automation one.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import envelopeFind from "./actions/envelope-find.ts";
import envelopeGet from "./actions/envelope-get.ts";
import envelopeUse from "./actions/envelope-use.ts";
import envelopeUpdate from "./actions/envelope-update.ts";
import envelopeDistribute from "./actions/envelope-distribute.ts";
import envelopeRedistribute from "./actions/envelope-redistribute.ts";
import envelopeCancel from "./actions/envelope-cancel.ts";
import envelopeDuplicate from "./actions/envelope-duplicate.ts";
import envelopeDelete from "./actions/envelope-delete.ts";
import envelopeRecipientAdd from "./actions/envelope-recipient-add.ts";
import envelopeRecipientUpdate from "./actions/envelope-recipient-update.ts";
import envelopeRecipientGet from "./actions/envelope-recipient-get.ts";
import envelopeRecipientRemove from "./actions/envelope-recipient-remove.ts";
import envelopeFieldAdd from "./actions/envelope-field-add.ts";
import envelopeFieldRemove from "./actions/envelope-field-remove.ts";
import envelopeAuditLog from "./actions/envelope-audit-log.ts";
import envelopeDownload from "./actions/envelope-download.ts";
import envelopeCertificateDownload from "./actions/envelope-certificate-download.ts";
import folderList from "./actions/folder-list.ts";
import folderCreate from "./actions/folder-create.ts";

import instance from "./health/instance.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // envelopes — the unit of signing
    envelopeFind,
    envelopeGet,
    envelopeUse,
    envelopeUpdate,
    // sending, and unsending
    envelopeDistribute,
    envelopeRedistribute,
    envelopeCancel,
    envelopeDuplicate,
    envelopeDelete,
    // who signs
    envelopeRecipientAdd,
    envelopeRecipientUpdate,
    envelopeRecipientGet,
    envelopeRecipientRemove,
    // where they sign
    envelopeFieldAdd,
    envelopeFieldRemove,
    // the evidence
    envelopeAuditLog,
    envelopeDownload,
    envelopeCertificateDownload,
    // filing
    folderList,
    folderCreate,
  ],
  auth: [apiKey],
  healthChecks: [instance, quota],
} satisfies AppDefinition;
