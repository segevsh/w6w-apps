import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SimpleTextingClient } from "../lib/client.ts";
import { listIdOrNameParam } from "../lib/params.ts";

/**
 * `DELETE /api/contact-lists/{listIdOrName}/contacts/{contactPhoneOrId}` —
 * "Remove Contact From List".
 *
 * Answers `204` with no body: "Success. Contact was removed from list." Two path
 * parameters, both of which accept either form — a list name or ID, and a phone
 * number or contact ID — so both are escaped as single segments.
 *
 * This is the operation that makes add/remove usable as a pair without a
 * replacement pass: with `listsReplacement` on (the default elsewhere in this
 * API), changing one membership rewrites all of them; here, one call changes
 * exactly one membership and leaves the rest of the contact alone.
 *
 * Idempotent in the sense the runtime cares about: the contact's membership in
 * that list is gone after one call and after five.
 */
interface Input {
  listIdOrName: string;
  contactPhoneOrId: string;
}

const contactListRemoveContact: ActionDefinition<Input> = {
  key: "contact-list-remove-contact",
  type: "perform",
  resource: "contact-list",
  title: "Remove Contact From List",
  description: "Remove one contact from a contact list by phone number or ID.",
  idempotent: true,
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
    { key: "contactPhoneOrId", type: "string", label: "Contact removed" },
    { key: "status", type: "number", label: "HTTP status — 204 on success" },
  ],

  async execute(input, ctx) {
    const status = await new SimpleTextingClient(ctx).status(
      `/api/contact-lists/${encodePathSegment(input.listIdOrName)}/contacts/${
        encodePathSegment(input.contactPhoneOrId)
      }`,
      { method: "DELETE" },
    );
    ctx.log("info", "removed a contact from a SimpleTexting list", { status });
    return {
      listIdOrName: input.listIdOrName,
      contactPhoneOrId: input.contactPhoneOrId,
      status,
    };
  },
};

export default contactListRemoveContact;
