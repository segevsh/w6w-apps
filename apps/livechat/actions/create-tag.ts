import type { ActionDefinition } from "@w6w/types";
import { LiveChatClient, optIntList, requireString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "create-tag",
  type: "perform",
  idempotent: false,
  resource: "tag",
  title: "Create tag",
  description:
    "Create a tag, optionally limited to groups (`POST /v3.6/configuration/action/create_tag`). " +
    "Needs `tags--all:rw` or `tags--groups:rw`. Matching an existing name is case insensitive.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "groupIds",
      label: "Group IDs",
      type: "string",
      hint: "Comma-separated integers. May be empty.",
    },
  ],
  output: [{ key: "created", type: "boolean", label: "True when LiveChat accepted the call" }],

  async execute(input, ctx) {
    const groupIds = optIntList(input.groupIds, "groupIds");
    await new LiveChatClient(ctx).config("create_tag", {
      name: requireString(input.name, "name"),
      ...(groupIds ? { group_ids: groupIds } : {}),
    });
    return { created: true };
  },
};

export default action;
