import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  groupId: number;
}

const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Fetch a group with its members and assigned forms.",
  params: [
    idParam("groupId", "Group ID"),
  ],
  output: [
    { key: "data", type: "object", label: "The group" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/groups/${encodeId(input.groupId)}`);
  },
};

export default groupGet;
