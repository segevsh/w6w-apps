import type { ActionDefinition } from "@w6w/types";
import { asStringArray, compact, SimpleTextingClient } from "../lib/client.ts";
import { contactBodyParams, upsertParams } from "../lib/params.ts";

/**
 * `POST /api/contacts` — "Create a Contact".
 *
 * Answers `201` with `{id}`: the new contact's hexadecimal ID. Note the
 * spelling difference from a *read* — `Contact.contactId` — which is the
 * vendor's, not a typo here.
 *
 * ## Stricter than the schema, deliberately
 *
 * `SingleContactUpdate` marks **no** field required, so this action could send
 * an empty body. It requires `contactPhone` anyway, and says so: a contact is
 * addressed by phone number everywhere else in this API
 * (`/contacts/{contactIdOrNumber}` says "Phone number (preferred)"), the
 * vendor's own description of this endpoint is "Create a new contact and add
 * them to a specific list", and its own example always carries one. A contact
 * with no phone number is not one this app can text, so accepting one would
 * only move the mistake downstream.
 *
 * ## Two query parameters whose defaults are on
 *
 * Both `upsert` and `listsReplacement` default to `true` in the schema:
 *
 * - `upsert=true` — an existing contact with the same phone number is
 *   *updated* rather than rejected. Without knowing this, "create a contact"
 *   quietly becomes "overwrite a contact", which is why both are exposed as
 *   visible params with their vendor defaults.
 * - `listsReplacement=true` — the contact's list membership becomes exactly
 *   `listIds`, so naming one list removes every other. Turn it off to add
 *   without removing.
 */
interface Input {
  contactPhone: string;
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

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact, optionally adding them to one or more lists.",
  idempotent: false,
  params: [
    ...contactBodyParams(true),
    ...upsertParams(),
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID (hexadecimal)" },
  ],

  execute(input, ctx) {
    const listIds = asStringArray(input.listIds);
    ctx.log("info", "creating a SimpleTexting contact", {
      lists: listIds?.length ?? 0,
      createIfMissing: input.upsert ?? true,
    });

    return new SimpleTextingClient(ctx).json("/api/contacts", {
      method: "POST",
      query: { upsert: input.upsert, listsReplacement: input.listsReplacement },
      body: compact({
        contactPhone: input.contactPhone,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        birthday: input.birthday,
        customFields: input.customFields,
        comment: input.comment,
        listIds,
      }),
    });
  },
};

export default contactCreate;
