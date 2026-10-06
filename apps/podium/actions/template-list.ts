import type { ActionDefinition } from "@w6w/types";
import { PodiumClient, toList } from "../lib/client.ts";

interface Input {
  types?: string[] | string;
  locationUid?: string;
}

const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "read",
  resource: "template",
  title: "List Templates",
  description:
    "List message templates. Template variables are not expanded by Send Message. Requires scope `read_templates`.",
  params: [{
    key: "types",
    label: "Types",
    type: "string",
    hint: "Comma-separated: custom, review_invite, review_invite_backup (default custom).",
  }, {
    key: "locationUid",
    label: "Location UID",
    type: "string",
    hint: "Podium location uid.",
  }],
  output: [{
    key: "items",
    type: "array",
    label: "Items",
  }, {
    key: "nextCursor",
    type: "string",
    label: "Cursor for the next page (null on the last page)",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).list("/templates", {
      query: {
        types: toList(input.types),
        locationUid: input.locationUid,
      },
    });
  },
};

export default templateList;
