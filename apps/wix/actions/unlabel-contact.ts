import type { ActionDefinition } from "@w6w/types";
import { WixClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  labelKeys: string;
}

/**
 * `DELETE /contacts/v4/contacts/{contactId}/labels` — handler
 * `wix.contacts.v4.contact:UnlabelContact`.
 *
 * The label keys travel in a JSON **body** on a DELETE, which is unusual but is
 * exactly what Wix's own documented example does.
 */
const unlabelContact: ActionDefinition<Input> = {
  key: "unlabel-contact",
  type: "perform",
  resource: "contact",
  /** Idempotent: removing a label the contact no longer has leaves the same set. */
  idempotent: true,
  title: "Unlabel Contact",
  description:
    "Remove one or more labels from a contact. The label itself is not deleted, only its association with this contact.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "labelKeys",
      label: "Label keys",
      type: "string",
      required: true,
      hint: "Comma-separated, e.g. `custom.vip,custom.newsletter`.",
    },
  ],
  output: [{ key: "contact", type: "object", label: "The relabelled contact" }],

  execute(input, ctx) {
    const labelKeys = input.labelKeys.split(",").map((s) => s.trim()).filter(Boolean);
    return new WixClient(ctx).request(
      `/contacts/v4/contacts/${encodeURIComponent(input.contactId)}/labels`,
      { method: "DELETE", body: { labelKeys } },
    );
  },
};

export default unlabelContact;
