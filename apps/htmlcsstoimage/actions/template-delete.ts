import type { ActionDefinition } from "@w6w/types";
import { encodeId, HctiClient } from "../lib/client.ts";

/**
 * `DELETE /v1/template/{id}` — remove a template and clear all of its contents.
 *
 * Needs `templates:delete`. The OpenAPI document lists only `400` and `404` responses (no
 * success status), so the status is returned as the vendor answered rather than assumed.
 * Per the vendor: images already rendered from the template may stay cached, but rendering
 * the template for a combination never rendered before fails afterwards.
 */
interface Input {
  template_id: string;
}

const templateDelete: ActionDefinition<Input> = {
  key: "template-delete",
  type: "perform",
  resource: "template",
  title: "Delete Template",
  description: "Remove a template and all its versions.",
  idempotent: true,
  params: [
    { key: "template_id", label: "Template ID", type: "string", required: true },
  ],
  output: [
    { key: "template_id", type: "string", label: "Template deleted" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    if (!input.template_id) throw new Error("template_id is required");
    const status = await new HctiClient(ctx).status(
      `/template/${encodeId(input.template_id)}`,
      { method: "DELETE" },
    );
    return { template_id: input.template_id, status };
  },
};

export default templateDelete;
