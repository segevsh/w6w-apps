import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v1/management/contact-attributes` */
const contactAttributeList: ActionDefinition<Input> = {
  key: "contact-attribute-list",
  type: "search",
  resource: "contact-attribute",
  title: "List Contact Attributes",
  description:
    "List every contact attribute value in the workspace (contact ID, attribute key ID, value).",
  params: [],
  output: [
    { key: "data", type: "array", label: "The records returned by Formbricks" },
  ],

  async execute(_input, ctx) {
    const res = await new FormbricksClient(ctx).request("GET", "/management/contact-attributes");
    return { data: res.data ?? [] };
  },
};

export default contactAttributeList;
