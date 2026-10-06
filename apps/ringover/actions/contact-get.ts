import type { ActionDefinition } from "@w6w/types";
import { RingoverClient, seg } from "../lib/client.ts";
import { CONTACT_OUTPUT, contactIdParam } from "../lib/params.ts";

interface Input {
  contactId: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact with all its phone numbers.",
  params: [
    contactIdParam,
  ],
  output: CONTACT_OUTPUT,

  execute(input, ctx) {
    return new RingoverClient(ctx).request("GET", `/contacts/${seg(input.contactId)}`);
  },
};

export default contactGet;
