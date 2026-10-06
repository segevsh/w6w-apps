import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient, seg } from "../lib/client.ts";

interface Input {
  contactAttributeKeyId: string;
}

/** `GET /api/v1/management/contact-attribute-keys/{contactAttributeKeyId}` */
const contactAttributeKeyGet: ActionDefinition<Input> = {
  key: "contact-attribute-key-get",
  type: "read",
  resource: "contact-attribute-key",
  title: "Get Contact Attribute Key",
  description: "Fetch one contact attribute key by ID.",
  params: [
    {
      "key": "contactAttributeKeyId",
      "label": "Contact attribute key ID",
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
      `/management/contact-attribute-keys/${seg(input.contactAttributeKeyId)}`,
    );
    return { data: res.data ?? null };
  },
};

export default contactAttributeKeyGet;
