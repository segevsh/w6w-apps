import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /users/{user_id}` — one user, with their working-week hours. */
interface Input {
  userId: number;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description:
    "Fetch one user by id — display name, email, branch, role, status, default rates and the " +
    "hours they normally work each day.",
  params: [idParam("userId", "User ID", "Ids come from List Users or a search over `users`.")],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "email", type: "string", label: "Email address" },
    { key: "branchId", type: "number", label: "Branch ID" },
    { key: "roleId", type: "number", label: "Role ID — null when no role is assigned" },
    { key: "userStatus", type: "object", label: "Status — `{ id, name }`" },
    { key: "costRate", type: "number", label: "Internal cost rate" },
    { key: "billableRate", type: "number", label: "Billable rate" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/users/${encodeId(input.userId)}`);
  },
};

export default userGet;
