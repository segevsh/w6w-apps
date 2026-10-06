import type { ActionDefinition } from "@w6w/types";
import { encodeId, SevenClient } from "../lib/client.ts";

/** `GET /api/groups/:id` */
interface Input {
  id: number;
}

const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Retrieve one contact group by id.",
  params: [{ key: "id", label: "Group ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Group id" },
    { key: "name", type: "string", label: "Group name" },
    { key: "members_count", type: "number", label: "Number of contacts" },
    { key: "created", type: "string", label: "Creation time" },
  ],

  execute(input, ctx) {
    return new SevenClient(ctx).request("GET", `/groups/${encodeId(input.id)}`);
  },
};

export default groupGet;
