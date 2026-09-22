import type { ActionDefinition } from "@w6w/types";
import { encodeId, SendfoxClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /contacts/{id}` — one contact.
 *
 * Answers the bare `Contact` entity, not `{"data": …}`. There is no "get by
 * email" — the list action's `email` filter is the way to resolve an address to
 * an id.
 */
interface Input {
  id: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact by id.",
  params: [
    idParam("id", "Contact", "Contact id, from List Contacts or Create Contact."),
  ],
  output: [
    { key: "id", type: "number", label: "Contact id" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "ip_address", type: "string", label: "Signup IP address" },
    { key: "unsubscribed_at", type: "string", label: "Unsubscribed at (null if subscribed)" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json(`/contacts/${encodeId(input.id)}`);
  },
};

export default contactGet;
