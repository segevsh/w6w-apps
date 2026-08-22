import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";

/**
 * `POST /template/delete/{template_id}` — verified against the official OpenAPI
 * document (`templateDelete`). Note the verb: a **POST**, not a DELETE.
 *
 * Deleting a template does not touch signature requests already sent from it —
 * those keep their own copy of the document. It does break any workflow that
 * sends by this template id.
 */
const action: ActionDefinition = {
  key: "template-delete",
  type: "perform",
  resource: "template",
  title: "Delete a template",
  description: "Delete a template. Requests already sent from it are unaffected.",
  idempotent: true,
  params: [
    { key: "templateId", label: "Template ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "template_id", type: "string", label: "Template ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.templateId ?? "").trim();
    if (!id) throw new Error("`templateId` is required");

    ctx.log("info", "deleting a Dropbox Sign template", { id });

    await new DropboxSignClient(ctx).request(
      `/template/delete/${encodeURIComponent(id)}`,
      { method: "POST" },
    );
    return { template_id: id, deleted: true };
  },
};

export default action;
