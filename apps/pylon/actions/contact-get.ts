import type { ActionDefinition } from "@w6w/types";
import { PylonClient, seg } from "../lib/client.ts";
import { CONTACT_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /contacts/{id}` — accepts the Pylon ID or an external ID. */
const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact by its Pylon ID or one of its external IDs.",
  params: [idParam("Contact ID or external ID")],
  output: CONTACT_OUTPUT,

  execute(input, ctx) {
    return new PylonClient(ctx).one("GET", `/contacts/${seg(input.id)}`);
  },
};

export default contactGet;
