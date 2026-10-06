import type { ActionDefinition } from "@w6w/types";
import { LiveChatClient, requireString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "delete-tag",
  type: "perform",
  idempotent: false,
  resource: "tag",
  title: "Delete tag",
  description:
    "Delete a tag (`POST /v3.6/configuration/action/delete_tag`). Needs `tags--all:rw` or " +
    "`tags--groups:rw`. The name is matched case sensitively here, unlike create.",
  params: [{ key: "name", label: "Name", type: "string", required: true, hint: "Case sensitive." }],
  output: [{ key: "deleted", type: "boolean", label: "True when LiveChat accepted the call" }],

  async execute(input, ctx) {
    await new LiveChatClient(ctx).config("delete_tag", { name: requireString(input.name, "name") });
    return { deleted: true };
  },
};

export default action;
