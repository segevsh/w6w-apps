import type { ActionDefinition } from "@w6w/types";
import { encodeId, SendfoxClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /contacts/{id}` — delete a contact.
 *
 * The document describes this as a **soft delete** that also cancels any
 * scheduled deliverables, so a deleted contact stops receiving.
 *
 * Answers `{message}` rather than the deleted entity. Idempotent in the sense
 * that matters for a retry — a second delete causes no further state change —
 * although the API itself will answer `404` for the second call.
 */
interface Input {
  id: number;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Soft-delete a contact and cancel any scheduled emails to it.",
  idempotent: true,
  params: [
    idParam("id", "Contact", "Contact id to delete."),
  ],
  output: [{ key: "message", type: "string", label: "Confirmation message" }],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json(`/contacts/${encodeId(input.id)}`, { method: "DELETE" });
  },
};

export default contactDelete;
