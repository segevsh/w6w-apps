import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient, seg } from "../lib/client.ts";

interface Input {
  contactId: string;
}

/** `GET /api/v1/management/contacts/{contactId}` */
const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact by ID.",
  params: [
    {
      "key": "contactId",
      "label": "Contact ID",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    { key: "data", type: "object", label: "The record returned by Formbricks" },
  ],

  async execute(input, ctx) {
    const res = await new FormbricksClient(ctx).request(
      "GET",
      `/management/contacts/${seg(input.contactId)}`,
    );
    return { data: res.data ?? null };
  },
};

export default contactGet;
