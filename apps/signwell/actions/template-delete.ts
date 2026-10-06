import type { ActionDefinition } from "@w6w/types";
import { requireId, SignWellClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /api/v1/document_templates/{id}` — verified against SignWell's OpenAPI document
 * (`deleteTemplate`): 204 no content, 404 if it is gone.
 */
const templateDelete: ActionDefinition = {
  key: "template-delete",
  type: "perform",
  resource: "template",
  title: "Delete a Template",
  description: "Delete a template. Documents already created from it are not affected.",
  idempotent: true,
  params: [idParam("Template id")],
  output: [
    { key: "id", type: "string", label: "Template id" },
    { key: "deleted", type: "boolean", label: "True once SignWell answered 204" },
  ],

  async execute(input, ctx) {
    const id = requireId((input as { id?: unknown }).id);
    ctx.log("info", "deleting a SignWell template", { id });
    await new SignWellClient(ctx).request(`/document_templates/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return { id, deleted: true };
  },
};

export default templateDelete;
