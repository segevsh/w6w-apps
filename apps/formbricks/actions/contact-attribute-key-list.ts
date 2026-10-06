import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v1/management/contact-attribute-keys` */
const contactAttributeKeyList: ActionDefinition<Input> = {
  key: "contact-attribute-key-list",
  type: "search",
  resource: "contact-attribute-key",
  title: "List Contact Attribute Keys",
  description: "List the contact attribute keys defined in the workspace.",
  params: [],
  output: [
    { key: "data", type: "array", label: "The records returned by Formbricks" },
  ],

  async execute(_input, ctx) {
    const res = await new FormbricksClient(ctx).request(
      "GET",
      "/management/contact-attribute-keys",
    );
    return { data: res.data ?? [] };
  },
};

export default contactAttributeKeyList;
