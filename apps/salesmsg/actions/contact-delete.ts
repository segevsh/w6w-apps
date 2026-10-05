import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `DELETE /contacts/{contact}` (scope `contacts:write`). The document says a contact that texts in
 * again is added back. Answers an array of strings, returned as `response`.
 */
interface Input {
  contact: number;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact.",
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
  output: [
    { key: "deleted", type: "boolean", label: "True when the request succeeded" },
    { key: "response", type: "array", label: "The vendor's answer" },
  ],

  async execute(input, ctx) {
    const response = await new SalesmsgClient(ctx).json(
      `/contacts/${encodePathSegment(input.contact)}`,
      {
        method: "DELETE",
      },
    );
    return { deleted: true, response: response ?? null };
  },
};

export default contactDelete;
