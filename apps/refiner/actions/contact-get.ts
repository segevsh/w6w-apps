import type { ActionDefinition } from "@w6w/types";
import { CONTACT_REF_PARAMS, contactRef, RefinerClient } from "../lib/client.ts";

interface Input {
  id?: string;
  email?: string;
  uuid?: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description:
    "Fetch everything Refiner holds for one contact: attributes (traits merged with survey " +
    "answers), segments and account. Give one of user id, email or Refiner uuid.",
  params: CONTACT_REF_PARAMS,
  output: [
    { key: "uuid", type: "string", label: "Contact UUID" },
    { key: "remote_id", type: "string", label: "Your user id" },
    { key: "email", type: "string", label: "Email" },
    { key: "attributes", type: "object", label: "Attributes" },
    { key: "segments", type: "array", label: "Segments" },
    { key: "account", type: "object", label: "Account" },
  ],

  async execute(input, ctx) {
    return await new RefinerClient(ctx).json("/contact", { query: contactRef(input) });
  },
};

export default contactGet;
