import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient } from "../lib/client.ts";

/**
 * `POST /envelope/field/delete` — verified against Documenso's v2 OpenAPI
 * document (required `fieldId`).
 *
 * Takes the field's own id, which `envelope-get` returns. Removing a signature
 * field from an envelope that has already been distributed is refused — the
 * document a recipient is looking at cannot change underneath them.
 */
const action: ActionDefinition = {
  key: "envelope-field-remove",
  type: "perform",
  resource: "field",
  title: "Remove a field",
  description: "Remove a field from a draft envelope.",
  idempotent: true,
  params: [
    { key: "fieldId", label: "Field ID", type: "number", required: true },
  ],
  output: [
    { key: "fieldId", type: "number", label: "Field id" },
    { key: "removed", type: "boolean", label: "Removed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const fieldId = Number(p.fieldId);
    if (!Number.isFinite(fieldId)) throw new Error("`fieldId` is required");

    ctx.log("info", "removing a Documenso field", { fieldId });

    await new DocumensoClient(ctx).request("/envelope/field/delete", {
      method: "POST",
      body: { fieldId },
    });
    return { fieldId, removed: true };
  },
};

export default action;
