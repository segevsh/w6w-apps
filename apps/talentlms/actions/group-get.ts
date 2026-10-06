import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  groupId: number;
}

const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Fetch one group with its users and courses.",
  params: [
    { key: "groupId", label: "Group ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("groups", {
      id: input.groupId,
    });
  },
};

export default groupGet;
