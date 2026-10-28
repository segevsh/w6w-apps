import type { ActionDefinition } from "@w6w/types";
import { listUsers, type ListUsersInput } from "../lib/users.ts";
import { pageParams, usersOutput, userType } from "../lib/params.ts";

const userList: ActionDefinition<ListUsersInput> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description:
    "List the users of the Bigin organization. `type=CurrentUser` returns the profile of the user this connection is authorized as, which is how a workflow resolves the acting user's id.",
  params: [userType, ...pageParams],
  output: usersOutput,

  execute(input, ctx) {
    return listUsers(ctx, input);
  },
};

export default userList;
