import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/emailmarketing/getcontacts.json` — Return the contacts of a list.
 */
interface Input {
  listId: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "Return the contacts of a list.",
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "contacts", type: "object", label: "Contacts: { count, items[] }" },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).get("emailmarketing/getcontacts", {
      listid: input.listId,
    });
  },
};

export default contactList;
