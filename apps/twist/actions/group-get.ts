import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/groups/getone`
 *
 * Get a group by id.
 */
interface Input {
  groupId: number;
}

const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Get a group by id.",
  params: [
    { key: "groupId", label: "Group ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return twist(ctx, { method: "GET", path: "/groups/getone", params: { "id": input.groupId } });
  },
};

export default groupGet;
