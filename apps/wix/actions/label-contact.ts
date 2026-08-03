import type { ActionDefinition } from "@w6w/types";
import { WixClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  labelKeys: string;
}

/**
 * `POST /contacts/v4/contacts/{contactId}/labels` — handler
 * `wix.contacts.v4.contact:LabelContact`.
 */
const labelContact: ActionDefinition<Input> = {
  key: "label-contact",
  type: "perform",
  resource: "contact",
  /** Idempotent: adding a label the contact already carries leaves the same set. */
  idempotent: true,
  title: "Label Contact",
  description:
    "Add one or more labels to a contact. The labels must already exist — create them with Find or Create Label first.",
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
      { method: "POST", body: { labelKeys } },
    );
  },
};

export default labelContact;
