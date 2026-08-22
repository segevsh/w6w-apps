import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient } from "../lib/client.ts";

/**
 * `GET /envelope/{envelopeId}` — verified against Documenso's v2 OpenAPI
 * document (`envelope-get`).
 *
 * The whole envelope: its recipients with their individual signing state, the
 * fields placed on it, and the documents inside it. **`status` is the
 * envelope's, and it only reaches `COMPLETED` when every recipient has
 * signed** — so a workflow polling for one person's signature reads
 * `recipients[].signingStatus` instead.
 *
 * For a template envelope, the recipients are placeholders, and their numeric
 * ids are what `envelope-use` maps real people onto.
 */
const action: ActionDefinition = {
  key: "envelope-get",
  type: "read",
  resource: "envelope",
  title: "Get an envelope",
  description: "One envelope, its recipients, fields and documents.",
  params: [
    { key: "envelopeId", label: "Envelope ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Envelope id" },
    { key: "title", type: "string", label: "Title" },
    { key: "type", type: "string", label: "DOCUMENT or TEMPLATE" },
    {
      key: "status",
      type: "string",
      label: "Envelope status — COMPLETED only when EVERY recipient has signed",
    },
    { key: "recipients", type: "array", label: "Per-recipient state, and template ids" },
    { key: "fields", type: "array", label: "Fields placed on the documents" },
    { key: "envelopeItems", type: "array", label: "The documents inside" },
    { key: "externalId", type: "string", label: "Your own id, if you set one" },
    { key: "createdAt", type: "string", label: "Created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.envelopeId ?? "").trim();
    if (!id) throw new Error("`envelopeId` is required");

    ctx.log("info", "getting a Documenso envelope", { id });

    return await new DocumensoClient(ctx).request(`/envelope/${encodeURIComponent(id)}`);
  },
};

export default action;
