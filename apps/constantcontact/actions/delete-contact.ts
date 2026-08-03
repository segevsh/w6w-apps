import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

/**
 * `DELETE /v3/contacts/{contact_id}` — 204 No Content on success.
 *
 * Delete and unsubscribe are **not** the same thing and choosing the wrong one
 * has consequences that are hard to walk back:
 *
 *   - *Deleted* contacts stop receiving email and stop counting toward the
 *     billable active-contact total. They can be revived — a `PUT` with
 *     `update_source: "Account"` brings one back.
 *   - *Unsubscribed* contacts also stop receiving email, but the opt-out is a
 *     record of consent being withdrawn and cannot be undone by the account.
 *     Only the contact themselves can resubscribe, by confirming a resubscribe
 *     email.
 *
 * If the goal is "honour an opt-out", use Unsubscribe Contact. If it is
 * "remove this record from the account", this is the right call.
 *
 * `idempotent: true` — a second delete of an already-deleted contact leaves
 * the account in the same state.
 */
const deleteContact: ActionDefinition<Input> = {
  key: "delete-contact",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description:
    "Delete a contact by `contact_id`. Reversible via a PUT with update_source Account — unlike an unsubscribe.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    await client.request(`/contacts/${encodeURIComponent(input.contactId)}`, { method: "DELETE" });
    return { success: true };
  },
};

export default deleteContact;
