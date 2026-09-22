import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SimpleTextingClient } from "../lib/client.ts";
import { contactIdParam } from "../lib/params.ts";

/**
 * `GET /api/contacts/{contactIdOrNumber}` — "Get a Contact".
 *
 * The document's own words on the path parameter: "Phone number (preferred) or
 * Contact ID in hexadecimal format". So the phone number is the shorter route —
 * a workflow that holds a number from an incoming message can read the contact
 * without first listing contacts to translate it into an ID.
 *
 * The response is the full `Contact`, whose required members are `contactId`,
 * `contactPhone`, `email`, `firstName` and `lastName`: a contact created
 * through the API with only a phone number answers with the three name/email
 * fields present but empty rather than absent, which is worth knowing before
 * branching on them.
 *
 * `lists` is an array of `{id, name}` — the memberships, not just names, so the
 * `id` is directly usable in `contact-update`'s `listIds`.
 */
interface Input {
  contactIdOrNumber: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Read one contact by phone number (preferred) or hexadecimal ID.",
  params: [contactIdParam],
  output: [
    { key: "contactId", type: "string", label: "Contact ID" },
    { key: "contactPhone", type: "string", label: "Phone number" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "birthday", type: "string", label: "Birthday (yyyy-mm-dd)" },
    { key: "lists", type: "array", label: "List memberships ({id, name})" },
    { key: "customFields", type: "object", label: "Custom field values" },
    { key: "comment", type: "string", label: "Comment" },
    { key: "subscriptionStatus", type: "string", label: "Subscription status" },
    { key: "updateSource", type: "string", label: "How the contact was last changed" },
    { key: "created", type: "string", label: "Created at (ISO 8601)" },
    { key: "updated", type: "string", label: "Updated at (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).json(
      `/api/contacts/${encodePathSegment(input.contactIdOrNumber)}`,
    );
  },
};

export default contactGet;
