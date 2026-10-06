import type { ActionDefinition } from "@w6w/types";
import { PylonClient, seg } from "../lib/client.ts";
import { idParam, USER_OUTPUT } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /users/{id}`. */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one user by ID.",
  params: [idParam("User ID")],
  output: USER_OUTPUT,

  execute(input, ctx) {
    return new PylonClient(ctx).one("GET", `/users/${seg(input.id)}`);
  },
};

export default userGet;
