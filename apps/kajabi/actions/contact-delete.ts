import type { ActionDefinition } from "@w6w/types";
import { KajabiClient } from "../lib/client.ts";
import { idParam, resourceOutput } from "../lib/params.ts";

/**
 * `DELETE /v1/contacts/{id}` — remove a contact.
 *
 * Destructive and not reversible through this API: there is no undelete
 * endpoint and no soft-delete flag in the spec. Kajabi does document a
 * `filter[is_hidden]` on the contact collection, which suggests hiding is the
 * gentler operation — but no endpoint in the document *sets* it, so this app
 * cannot offer it and will not pretend to.
 *
 * Marked idempotent: deleting an already-deleted contact converges on the same
 * state. The 404 that a repeat produces is the correct answer, not a new
 * failure — which is what makes this safe for the runtime to retry.
 */
interface Input {
  id: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description:
    "Permanently delete a contact. Kajabi provides no undelete — consider revoking offers or " +
    "unsubscribing instead if the record may be needed later.",
  idempotent: true,
  params: [idParam("Contact ID", "`contact-list` returns the ids.")],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/contacts/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default contactDelete;
