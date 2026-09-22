import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SimpleTextingClient } from "../lib/client.ts";
import { listIdOrNameParam } from "../lib/params.ts";

/**
 * `POST /api/contact-lists/{listIdOrName}/contacts` — "Add Contact To List".
 *
 * The body is a single field, `contactPhoneOrId`: "Contact ID in hexadecimal
 * format or the contact's phone number." The document marks nothing required in
 * `ContactPhoneOrIdDto`, but a membership with no contact is not a thing, so the
 * param is required here — the same stricter-than-schema call as Create
 * Contact, and for the same reason.
 *
 * ## The answer is a status, not an entity
 *
 * The endpoint answers `200` with no documented body ("Response 200: Success.
 * Fetched list."). There is no membership object and no contact row to return,
 * so the action returns the status plus the two values it was given. The
 * "Fetched list" wording is the vendor's and does not describe a list body: the
 * schema declares no content for this response at all.
 *
 * ## `idempotent: false`, because duplicate membership is unverified
 *
 * Adding a contact who is already on the list is not documented either way. If
 * the server appends, a retry leaves the contact on the list twice — and this
 * endpoint has no idempotency key to make that observable. `false` is the honest
 * declaration: a retried step may duplicate, so the runtime is not told it is
 * free to retry. Use List Contact Lists or Get Contact List to see membership
 * instead of re-adding.
 */
interface Input {
  listIdOrName: string;
  contactPhoneOrId: string;
}

const contactListAddContact: ActionDefinition<Input> = {
  key: "contact-list-add-contact",
  type: "perform",
  resource: "contact-list",
  title: "Add Contact To List",
  description: "Add one contact to a contact list by phone number or ID.",
  idempotent: false,
  params: [
    listIdOrNameParam,
    {
      key: "contactPhoneOrId",
      label: "Contact",
      type: "string",
      required: true,
      placeholder: "1234567890",
      hint: "The contact's phone number or hexadecimal ID.",
    },
  ],
  output: [
    { key: "listIdOrName", type: "string", label: "List" },
    { key: "contactPhoneOrId", type: "string", label: "Contact added" },
    { key: "status", type: "number", label: "HTTP status — 200 on success" },
  ],

  async execute(input, ctx) {
    const status = await new SimpleTextingClient(ctx).status(
      `/api/contact-lists/${encodePathSegment(input.listIdOrName)}/contacts`,
      { method: "POST", body: { contactPhoneOrId: input.contactPhoneOrId } },
    );
    ctx.log("info", "added a contact to a SimpleTexting list", { status });
    return {
      listIdOrName: input.listIdOrName,
      contactPhoneOrId: input.contactPhoneOrId,
      status,
    };
  },
};

export default contactListAddContact;
