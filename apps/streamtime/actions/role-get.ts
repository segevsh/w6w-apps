import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /roles/{role_id}` — one role. */
interface Input {
  roleId: number;
}

const roleGet: ActionDefinition<Input> = {
  key: "role-get",
  type: "read",
  resource: "role",
  title: "Get Role",
  description: "Fetch one role by id.",
  params: [idParam("roleId", "Role ID", "Ids come from List Roles.")],
  output: [
    { key: "id", type: "number", label: "Role ID" },
    { key: "name", type: "string", label: "Role name" },
    { key: "active", type: "boolean", label: "Is the role active" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/roles/${encodeId(input.roleId)}`);
  },
};

export default roleGet;
