import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/emailmarketing/getcontact.json` — Return one contact by ID.
 */
interface Input {
  id: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Return one contact by ID.",
  params: [
    {
      key: "id",
      label: "Contact ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "contact", type: "object", label: "The contact" },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).get("emailmarketing/getcontact", {
      id: input.id,
    });
  },
};

export default contactGet;
