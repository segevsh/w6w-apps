import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `PUT /contacts/opt-out/{contact}` (scope `contacts:write`). Returns the updated contact;
 * `opt_out` is then true.
 */
interface Input {
  contact: number;
}

const contactOptOut: ActionDefinition<Input> = {
  key: "contact-opt-out",
  type: "perform",
  resource: "contact",
  title: "Opt Out Contact",
  description: "Mark a contact as opted out, so it can no longer be messaged.",
  idempotent: true,
  params: [
    {
      key: "contact",
      label: "Contact ID",
      type: "number",
      required: true,
      hint: "The contact ID.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [{ key: "response", type: "object", label: "The updated contact" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json(`/contacts/opt-out/${encodePathSegment(input.contact)}`, {
      method: "PUT",
    });
  },
};

export default contactOptOut;
