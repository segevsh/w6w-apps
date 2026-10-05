import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `GET /contacts/{contact}` — "Get contact by id" (scope `contacts:read`). The full contact: name,
 * number, email, opt-in state, tags, notes and custom fields.
 */
interface Input {
  contact: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Get a contact by ID.",
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
  output: [{ key: "response", type: "object", label: "Contact" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json(`/contacts/${encodePathSegment(input.contact)}`);
  },
};

export default contactGet;
