import type { ActionDefinition } from "@w6w/types";
import { compact, encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `PUT /contacts/{contact}` (scope `contacts:write`). Takes a JSON body, unlike create. Only the
 * fields supplied are sent. Custom-field updates (`customFields`, and `PUT
 * /contacts/{contact}/custom-fields`) are not exposed: the document types the values as arrays of
 * `{type}` objects without saying what they hold.
 */
interface Input {
  contact: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  number?: string;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact's name, email or number.",
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
    {
      key: "first_name",
      label: "First name",
      type: "string",
    },
    {
      key: "last_name",
      label: "Last name",
      type: "string",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
    },
    {
      key: "number",
      label: "Phone number",
      type: "string",
    },
  ],
  output: [{ key: "response", type: "object", label: "The updated contact" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json(`/contacts/${encodePathSegment(input.contact)}`, {
      method: "PUT",
      body: compact({
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        number: input.number,
      }),
    });
  },
};

export default contactUpdate;
