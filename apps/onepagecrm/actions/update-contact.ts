import type { ActionDefinition } from "@w6w/types";
import { encodeId, OnePageClient } from "../lib/client.ts";
import { CONTACT_FIELD_PARAMS, contactBody } from "../lib/params.ts";

/**
 * `PUT /contacts/{contact_id}` — update a contact.
 *
 * The vendor's PUT REPLACES the whole record unless `partial=true`: an omitted field is cleared
 * (tags and communication lists emptied, status reset to `lead`). This action therefore sends
 * `partial=true` by default and only the fields you provide change; set `replace` to opt into the
 * vendor's full-replace behaviour. Arrays (emails, phones, tags…) always replace, never merge.
 */
const updateContact: ActionDefinition<Record<string, unknown>> = {
  key: "update-contact",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Change fields on a contact. Only the fields you send change (unless Replace is set).",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "companyId",
      label: "Company ID",
      type: "string",
      hint: "Moves the contact to an existing company.",
    },
    ...CONTACT_FIELD_PARAMS,
    {
      key: "replace",
      label: "Replace whole record",
      type: "boolean",
      default: false,
      hint: "Off (default) = partial update. On = vendor full replace: omitted fields are cleared.",
    },
  ],
  output: [{ key: "contact", type: "object", label: "The updated contact" }],

  async execute(input, ctx) {
    return await new OnePageClient(ctx).data(`/contacts/${encodeId(input.contactId as string)}`, {
      method: "PUT",
      query: { partial: input.replace === true ? undefined : true },
      body: contactBody(input),
    });
  },
};

export default updateContact;
