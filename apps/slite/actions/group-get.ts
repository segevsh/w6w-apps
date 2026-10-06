import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { seg } from "../lib/params.ts";

/** `GET /v1/groups/{groupId}` (operationId `getGroupById`); an unknown id is a documented 404. */
interface Input {
  groupId: string;
}

const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Return a group by id.",
  params: [{ key: "groupId", label: "Group ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Group id" },
    { key: "name", type: "string", label: "Group name" },
    { key: "description", type: "string", label: "Description" },
  ],

  execute(input, ctx) {
    return new SliteClient(ctx).get(`/groups/${seg(input.groupId, "groupId")}`);
  },
};

export default groupGet;
