import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, SendfoxClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /lists/{list_id}/contacts` — add an existing contact to a list.
 *
 * The body is `{contact_id}`, not the contact's email: the contact must already
 * exist, and `contact-create` (with its own `lists`) is the way to make one into
 * a list member in a single call.
 *
 * The document states "If the contact is already in the list, no duplicate is
 * created", so this is safe to retry — declared `idempotent: true`.
 *
 * Answers the bare `Contact` entity.
 */
interface Input {
  listId: number;
  contactId: number;
}

const listContactsAdd: ActionDefinition<Input> = {
  key: "list-contacts-add",
  type: "perform",
  resource: "list",
  title: "Add Contact to List",
  description: "Add an existing contact to a list. Idempotent — no duplicate membership.",
  idempotent: true,
  params: [
    idParam("listId", "List", "List id to add the contact to."),
    idParam("contactId", "Contact", "Existing contact id to add."),
  ],
  output: [
    { key: "id", type: "number", label: "Contact id" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json(`/lists/${encodeId(input.listId)}/contacts`, {
      method: "POST",
      body: compact({ contact_id: input.contactId }),
    });
  },
};

export default listContactsAdd;
