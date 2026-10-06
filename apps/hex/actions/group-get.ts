import type { ActionDefinition } from "@w6w/types";
import { encodeId, HexClient } from "../lib/client.ts";

/** `GET /v1/groups/{groupId}` — one group: `{ id, name, createdAt }`. */
interface Input {
  groupId: string;
}

const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Fetch one user group by id.",
  params: [{ key: "groupId", label: "Group ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created" },
  ],

  execute(input, ctx) {
    return new HexClient(ctx).json(`/groups/${encodeId(input.groupId)}`);
  },
};

export default groupGet;
