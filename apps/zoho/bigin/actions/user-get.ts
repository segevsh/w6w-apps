import type { ActionDefinition } from "@w6w/types";
import { getUser, type GetUserInput } from "../lib/users.ts";
import { userId } from "../lib/params.ts";

const userGet: ActionDefinition<GetUserInput> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieve one user of the Bigin organization by id.",
  params: [userId],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "full_name", type: "string", label: "Full name" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "active | inactive | ..." },
    { key: "role", type: "object", label: "Role" },
  ],

  execute(input, ctx) {
    return getUser(ctx, input);
  },
};

export default userGet;
