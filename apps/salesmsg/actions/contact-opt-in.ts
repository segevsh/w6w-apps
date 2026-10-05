import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `PUT /contacts/opt-in/{contact}` (scope `contacts:write`). Returns the updated contact. Only
 * call this for a contact who has actually consented — the consent record is yours to keep.
 */
interface Input {
  contact: number;
}

const contactOptIn: ActionDefinition<Input> = {
  key: "contact-opt-in",
  type: "perform",
  resource: "contact",
  title: "Opt In Contact",
  description: "Mark a contact as opted in, so it can be messaged again.",
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
    return new SalesmsgClient(ctx).json(`/contacts/opt-in/${encodePathSegment(input.contact)}`, {
      method: "PUT",
    });
  },
};

export default contactOptIn;
