import type { ActionDefinition } from "@w6w/types";
import { digits, RingoverClient, seg } from "../lib/client.ts";
import { contactIdParam } from "../lib/params.ts";

interface Input {
  contactId: number;
  number: string;
}

const contactNumberDelete: ActionDefinition<Input> = {
  key: "contact-number-delete",
  type: "perform",
  resource: "contact",
  title: "Remove Contact Phone Number",
  description: "Remove one phone number from a contact.",
  idempotent: true,
  params: [
    contactIdParam,
    {
      key: "number",
      label: "Phone number",
      type: "string",
      required: true,
      hint: "International format.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed" },
  ],

  async execute(input, ctx) {
    await new RingoverClient(ctx).request(
      "DELETE",
      `/contacts/${seg(input.contactId)}/numbers/${digits(input.number)}`,
    );
    return { deleted: true };
  },
};

export default contactNumberDelete;
