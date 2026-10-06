import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam, roleParam } from "../lib/params.ts";

interface Input {
  departmentId: number;
  userId: number;
  departmentRole: string;
}

const departmentUserAdd: ActionDefinition<Input> = {
  key: "department-user-add",
  type: "perform",
  resource: "department",
  title: "Add User to Department",
  description:
    "Add an existing user to a department with a role. If the user is already in it, the role is updated and the response says already_existed.",
  idempotent: true,
  params: [
    idParam("departmentId", "Department ID"),
    idParam("userId", "User ID"),
    roleParam(true),
  ],
  output: [
    { key: "data", type: "object", label: "The department membership" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/departments/${encodeId(input.departmentId)}/users`, {
      method: "POST",
      body: { user_id: input.userId, department_role: input.departmentRole },
    });
  },
};

export default departmentUserAdd;
