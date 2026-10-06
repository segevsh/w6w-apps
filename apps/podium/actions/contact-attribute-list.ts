import type { ActionDefinition } from "@w6w/types";
import { PodiumClient } from "../lib/client.ts";

type Input = Record<string, never>;

const contactAttributeList: ActionDefinition<Input> = {
  key: "contact-attribute-list",
  type: "read",
  resource: "contact-attribute",
  title: "List Contact Attributes",
  description:
    "List the contact attribute definitions owned by the token's application or organization. Not paginated. Requires scope `read_contacts`.",
  output: [{
    key: "items",
    type: "array",
    label: "Items",
  }, {
    key: "nextCursor",
    type: "string",
    label: "Cursor for the next page (null on the last page)",
  }],

  execute(_input, ctx) {
    return new PodiumClient(ctx).list("/contact_attributes");
  },
};

export default contactAttributeList;
