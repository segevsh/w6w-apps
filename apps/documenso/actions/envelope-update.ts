import type { ActionDefinition } from "@w6w/types";
import { compact, DocumensoClient, json } from "../lib/client.ts";
import { ENVELOPE_PARAM } from "../lib/params.ts";

/**
 * `POST /envelope/update` — verified against Documenso's v2 OpenAPI document.
 *
 * Changes the envelope's own properties — title, external id, folder, and the
 * `meta` that carries the signing subject, message and redirect. **It does not
 * touch recipients or fields**, which have their own actions, and it stops
 * working once the envelope is distributed: a pending envelope is a contract
 * somebody may already be reading.
 */
const action: ActionDefinition = {
  key: "envelope-update",
  type: "perform",
  resource: "envelope",
  title: "Update an envelope",
  description: "Change a draft envelope's title, folder or signing options.",
  idempotent: true,
  params: [
    ENVELOPE_PARAM,
    { key: "title", label: "Title", type: "string", default: "" },
    { key: "externalId", label: "External ID", type: "string", default: "" },
    { key: "folderId", label: "Folder ID", type: "string", default: "" },
    {
      key: "meta",
      label: "Signing Options",
      type: "json",
      default: "",
      placeholder: '{"subject":"Please sign","redirectUrl":"https://example.com/thanks"}',
      hint: "Documenso's `meta` object — subject, message, redirect, signing order.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Envelope id" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const envelopeId = String(p.envelopeId ?? "").trim();
    if (!envelopeId) throw new Error("`envelopeId` is required");

    const data = compact({
      title: p.title,
      externalId: p.externalId,
      folderId: p.folderId,
      meta: json(p.meta, "meta"),
    });
    if (Object.keys(data).length === 0) {
      throw new Error("nothing to update — set a title, external id, folder or signing options");
    }

    ctx.log("info", "updating a Documenso envelope", { envelopeId, fields: Object.keys(data) });

    return await new DocumensoClient(ctx).request("/envelope/update", {
      method: "POST",
      body: { envelopeId, data },
    });
  },
};

export default action;
