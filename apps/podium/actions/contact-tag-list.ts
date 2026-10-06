import type { ActionDefinition } from "@w6w/types";
import { PodiumClient } from "../lib/client.ts";

type Input = Record<string, never>;

const contactTagList: ActionDefinition<Input> = {
  key: "contact-tag-list",
  type: "read",
  resource: "contact-tag",
  title: "List Contact Tags",
  description:
    "List every organization-level contact tag. Not paginated. Requires scope `read_contacts`.",
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
    return new PodiumClient(ctx).list("/contact_tags");
  },
};

export default contactTagList;
