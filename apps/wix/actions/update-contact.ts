import type { ActionDefinition } from "@w6w/types";
import { compact, WixClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  revision: number;
  info: Record<string, unknown>;
  allowDuplicates?: boolean;
}

/** `PATCH /contacts/v4/contacts/{contactId}` — handler `wix.contacts.v4.contact:UpdateContact`. */
const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  resource: "contact",
  /**
   * Idempotent, and enforced by Wix rather than merely hoped for: the required
   * `revision` is optimistic-concurrency control. The first call applies the
   * change and bumps the revision; an identical retry carries the now-stale
   * revision and is rejected instead of applied twice. That is exactly the
   * property this flag is meant to describe.
   */
  idempotent: true,
  title: "Update Contact",
  description:
    "Update a contact. Requires the contact's current `revision` — read it with Get Contact first; a stale revision is rejected rather than silently overwriting a concurrent change.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "revision",
      label: "Revision",
      type: "number",
      required: true,
      hint: "The `revision` from Get Contact. Wix rejects the call if it is not current.",
    },
    {
      key: "info",
      label: "Contact info",
      type: "json",
      required: true,
      hint:
        'The Wix `info` object with the fields to change, e.g. `{"company": "Acme"}`. A site member\'s primary email cannot be changed here.',
    },
    {
      key: "allowDuplicates",
      label: "Allow duplicates",
      type: "boolean",
      hint: "Permit an email or phone that already belongs to another contact.",
    },
  ],
  output: [{ key: "contact", type: "object", label: "Updated contact" }],

  execute(input, ctx) {
    return new WixClient(ctx).request(
      `/contacts/v4/contacts/${encodeURIComponent(input.contactId)}`,
      {
        method: "PATCH",
        body: compact({
          info: input.info,
          revision: input.revision,
          allowDuplicates: input.allowDuplicates,
        }),
      },
    );
  },
};

export default updateContact;
