import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  departmentId: number;
}

const departmentUserList: ActionDefinition<Input> = {
  key: "department-user-list",
  type: "read",
  resource: "department",
  title: "List Department Users",
  description: "List the users in a department.",
  params: [
    idParam("departmentId", "Department ID"),
  ],
  output: [
    { key: "data", type: "array", label: "Users in the department" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/departments/${encodeId(input.departmentId)}/users`);
  },
};

export default departmentUserList;
