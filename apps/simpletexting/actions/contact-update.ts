import type { ActionDefinition } from "@w6w/types";
import { asStringArray, compact, encodePathSegment, SimpleTextingClient } from "../lib/client.ts";
import { contactBodyParams, contactIdParam, upsertParams } from "../lib/params.ts";

/**
 * `PUT /api/contacts/{contactIdOrNumber}` — "Update a Contact".
 *
 * Answers `200` with `{id}`. The body is the same `SingleContactUpdate` schema
 * Create Contact takes. Only the fields supplied are sent, and the document
 * does not say whether an omitted field is left alone or cleared — its own
 * example sends every field it wants to keep, which is the safe pattern here
 * too. The phone number itself is updatable: the document's own example updates
 * the contact at `.../contacts/3051234567`, which re-keys the contact.
 *
 * ## `listsReplacement` is how you add to a list without leaving the others
 *
 * The vendor's own example explains the flag: it sets
 * `listsReplacement=false` and says the contact "gets added to a new list while
 * remaining on the current one". That is the documented way to grow membership;
 * with the default (`true`) the contact's membership becomes exactly `listIds`.
 *
 * ## `upsert` defaults on, which is a sharp edge on a PUT
 *
 * With the schema's default `upsert=true`, PUTting a phone number that does not
 * exist **creates** a contact rather than failing. A workflow that means "update
 * this contact" and mistypes a digit gets a new contact, silently. Set Create If
 * Missing off to require the contact to exist; that is why the flag is a visible
 * param with its vendor default rather than an invisible one.
 */
interface Input {
  contactIdOrNumber: string;
  contactPhone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  birthday?: string;
  customFields?: unknown;
  comment?: string;
  listIds?: string[] | string;
  upsert?: boolean;
  listsReplacement?: boolean;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact's fields and list membership by phone number or ID.",
  idempotent: true,
  params: [
    contactIdParam,
    ...contactBodyParams(),
    ...upsertParams(),
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID (hexadecimal)" },
  ],

  execute(input, ctx) {
    const listIds = asStringArray(input.listIds);
    const body = compact({
      contactPhone: input.contactPhone,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      birthday: input.birthday,
      customFields: input.customFields,
      comment: input.comment,
      listIds,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Nothing to update — set at least one field.");
    }
    return new SimpleTextingClient(ctx).json(
      `/api/contacts/${encodePathSegment(input.contactIdOrNumber)}`,
      {
        method: "PUT",
        query: { upsert: input.upsert, listsReplacement: input.listsReplacement },
        body,
      },
    );
  },
};

export default contactUpdate;
