import type { ActionDefinition } from "@w6w/types";
import { asList, CleverReachClient, optString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "attribute-list",
  type: "search",
  resource: "attribute",
  title: "List attributes",
  description:
    "List global attributes, or one group's local attributes when a group id is given (`GET /v3/attributes`).",
  params: [
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      hint: "Leave empty for global attributes.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Number of records on this page" },
    {
      key: "raw",
      type: "object",
      label: "The body, when CleverReach did not answer with an array",
    },
  ],

  async execute(input, ctx) {
    return asList(
      await new CleverReachClient(ctx).request("/attributes", {
        query: { group_id: optString(input.groupId) },
      }),
    );
  },
};

export default action;
