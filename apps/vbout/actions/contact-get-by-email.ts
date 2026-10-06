import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/emailmarketing/getcontactbyemail.json` — Find a contact by email address, optionally within one list.
 */
interface Input {
  email: string;
  listId?: string;
}

const contactGetByEmail: ActionDefinition<Input> = {
  key: "contact-get-by-email",
  type: "read",
  resource: "contact",
  title: "Get Contact By Email",
  description: "Find a contact by email address, optionally within one list.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
    },
    {
      key: "listId",
      label: "List ID",
      type: "string",
      hint: "Restrict the lookup to this list.",
    },
  ],
  output: [
    { key: "contact", type: "object", label: "The contact" },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).get("emailmarketing/getcontactbyemail", {
      email: input.email,
      listid: input.listId,
    });
  },
};

export default contactGetByEmail;
