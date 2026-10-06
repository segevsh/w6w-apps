import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, compact, list, optString, pathId } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "receiver-tags-add",
  type: "perform",
  resource: "tag",
  title: "Add tags to a receiver",
  description:
    "Add tags to a receiver (`POST /v3/receivers/{id}/tags`). Returns the list of tags actually added. Characters outside letters, digits, `_` and `-` become `_`; `origin.tag` sets an origin.",
  idempotent: true,
  params: [
    { key: "receiver", label: "Receiver ID or email", type: "string", required: true, default: "" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated.",
    },
    { key: "groupId", label: "Group ID", type: "string", hint: "Optional." },
  ],
  output: [
    { key: "result", type: "object", label: "CleverReach's response body" },
  ],

  async execute(input, ctx) {
    const tags = list(input.tags);
    if (!tags) throw new Error("`tags` is required");
    const body = compact({ tags, group_id: optString(input.groupId) });
    return {
      result: await new CleverReachClient(ctx).request(
        `/receivers/${pathId(input.receiver, "receiver")}/tags`,
        {
          method: "POST",
          body,
        },
      ),
    };
  },
};

export default action;
