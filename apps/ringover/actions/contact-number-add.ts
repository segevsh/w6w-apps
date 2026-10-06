import type { ActionDefinition } from "@w6w/types";
import { digitsInt, RingoverClient, seg } from "../lib/client.ts";
import { contactIdParam, numberTypes } from "../lib/params.ts";

interface Input {
  contactId: number;
  number: string;
  type: string;
}

const contactNumberAdd: ActionDefinition<Input> = {
  key: "contact-number-add",
  type: "perform",
  resource: "contact",
  title: "Add Contact Phone Number",
  description: "Add one phone number to a contact.",
  idempotent: false,
  params: [
    contactIdParam,
    {
      key: "number",
      label: "Phone number",
      type: "string",
      required: true,
      hint: "International format.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: numberTypes,
      default: "mobile",
    },
  ],
  output: [
    { key: "added", type: "boolean", label: "Added" },
  ],

  async execute(input, ctx) {
    await new RingoverClient(ctx).request("POST", `/contacts/${seg(input.contactId)}/numbers`, {
      body: [{ number: digitsInt(input.number), type: input.type }],
    });
    return { added: true };
  },
};

export default contactNumberAdd;
