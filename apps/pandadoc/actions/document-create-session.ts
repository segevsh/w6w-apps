import type { ActionDefinition } from "@w6w/types";
import { compact, PandaDocClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  recipient: string;
  lifetime?: number;
}

/**
 * `POST /public/v1/documents/{id}/session` — mint a short-lived embedded
 * signing session for one recipient.
 *
 * Returns `{ id, expires_at }`. The `id` is the session key PandaDoc's embedded
 * signing surface consumes; it expires after `lifetime` seconds (default 3600).
 *
 * This action returns the session id and expiry verbatim and does **not**
 * assemble a URL. PandaDoc documents the session id as the input to its
 * embedding flow and documents the embed URL shape in its JavaScript SDK guide
 * rather than in this endpoint's reference, so building a link string here
 * would be this app inventing a URL format the vendor did not put in the
 * endpoint contract. Hand the id to whatever renders the embed.
 *
 * A recipient who should just get an email link needs no session at all — use
 * `document-send`, whose response carries a shared link per recipient.
 */
const documentCreateSession: ActionDefinition<Input> = {
  key: "document-create-session",
  type: "perform",
  resource: "document",
  title: "Create Signing Session",
  description:
    "Mint a short-lived embedded signing session for one recipient. Returns the session id and its expiry.",
  // Each call mints a distinct session with its own expiry; a retry produces a
  // second session rather than returning the first.
  idempotent: false,
  params: [
    documentIdParam,
    {
      key: "recipient",
      label: "Recipient email",
      type: "string",
      required: true,
      hint: "Email address of the recipient who will be given access to the document.",
    },
    {
      key: "lifetime",
      label: "Lifetime (seconds)",
      type: "number",
      hint: "How long the session stays valid. PandaDoc's default is 3600 (one hour).",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Session ID" },
    { key: "expires_at", type: "string", label: "Expires at" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating PandaDoc signing session", { documentId: input.documentId });
    const body = compact({ recipient: input.recipient, lifetime: input.lifetime });
    return await new PandaDocClient(ctx).request(
      `/documents/${encodeURIComponent(input.documentId)}/session`,
      { method: "POST", body },
    );
  },
};

export default documentCreateSession;
