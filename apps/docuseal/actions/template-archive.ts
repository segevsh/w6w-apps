import type { ActionDefinition } from "@w6w/types";
import { DocuSealClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /templates/{id}` — verified against DocuSeal's OpenAPI document
 * (`archiveTemplate`). Despite the HTTP verb this archives the template
 * rather than destroying it — the response carries an `archived_at`
 * timestamp, not an empty body. Re-archiving an already-archived template is
 * a harmless no-op on the vendor's side, so this is safe to retry.
 */
const templateArchive: ActionDefinition = {
  key: "template-archive",
  type: "perform",
  resource: "template",
  title: "Archive a Template",
  description:
    "Archive a document template. Does not delete it — use Update Template to unarchive.",
  idempotent: true,
  params: [idParam("Template ID")],
  output: [
    { key: "id", type: "number", label: "Template id" },
    { key: "archived_at", type: "string", label: "When it was archived" },
  ],

  async execute(input, ctx) {
    const id = Number((input as { id?: unknown }).id);
    if (!Number.isFinite(id)) throw new Error("`id` is required and must be a number.");

    ctx.log("info", "archiving a DocuSeal template", { id });

    return await new DocuSealClient(ctx).request(`/templates/${id}`, { method: "DELETE" });
  },
};

export default templateArchive;
