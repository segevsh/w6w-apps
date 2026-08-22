import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient } from "../lib/client.ts";
import { ENVELOPE_PARAM } from "../lib/params.ts";

/**
 * `POST /envelope/delete` — verified against Documenso's v2 OpenAPI document.
 * Note the verb: a **POST**, not a DELETE.
 *
 * **This takes the audit trail with it.** For a signed document that is the
 * whole evidentiary record — who opened it, when, from where — and it is the
 * part a clone of the PDF does not preserve. `envelope-cancel` stops a pending
 * envelope while keeping all of it, and is what "we sent the wrong version"
 * actually means.
 *
 * So this requires an explicit confirmation, and says which action to reach for
 * instead.
 */
const action: ActionDefinition = {
  key: "envelope-delete",
  type: "perform",
  resource: "envelope",
  title: "Delete an envelope",
  description: "Permanently delete an envelope and its audit trail. Cancelling keeps both.",
  idempotent: true,
  params: [
    ENVELOPE_PARAM,
    {
      key: "confirm",
      label: "I understand the audit trail goes with it",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. For a signed document the audit trail is the evidence — consider " +
        "Cancel instead.",
    },
  ],
  output: [
    { key: "envelopeId", type: "string", label: "Envelope id" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const envelopeId = String(p.envelopeId ?? "").trim();
    if (!envelopeId) throw new Error("`envelopeId` is required");
    if (p.confirm !== true) {
      throw new Error(
        "`confirm` must be true — deleting an envelope destroys its audit trail, and " +
          "cancelling does not",
      );
    }

    ctx.log("warn", "deleting a Documenso envelope", { envelopeId });

    await new DocumensoClient(ctx).request("/envelope/delete", {
      method: "POST",
      body: { envelopeId },
    });
    return { envelopeId, deleted: true };
  },
};

export default action;
