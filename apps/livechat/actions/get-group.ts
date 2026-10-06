import type { ActionDefinition } from "@w6w/types";
import { LiveChatClient, optInt, optStringList } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-group",
  type: "read",
  resource: "group",
  title: "Get group",
  description:
    "One group by id (`POST /v3.6/configuration/action/get_group`). Needs `groups--my:ro`, or " +
    "`groups--all:ro` for groups the agent is not a member of.",
  params: [
    {
      key: "groupId",
      label: "Group ID",
      type: "number",
      required: true,
      hint: "Integer; 0 is the default group.",
      validation: { min: 0, integer: true },
    },
    {
      key: "fields",
      label: "Additional fields",
      type: "multiselect",
      options: [
        { value: "agent_priorities", label: "Agents and their priorities" },
        { value: "routing_status", label: "Routing status" },
      ],
    },
  ],
  output: [{ key: "group", type: "object", label: "The group record" }],

  async execute(input, ctx) {
    const id = optInt(input.groupId, "groupId", 0, Number.MAX_SAFE_INTEGER);
    if (id === undefined) throw new Error("`groupId` is required");
    const fields = optStringList(input.fields, "fields");
    const group = await new LiveChatClient(ctx).config("get_group", {
      id,
      ...(fields ? { fields } : {}),
    });
    return { group };
  },
};

export default action;
