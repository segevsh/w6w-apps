import type { ActionDefinition } from "@w6w/types";
import { omit, twist } from "../lib/client.ts";

/**
 * `GET /api/v3/users/get_session_user`
 *
 * Get the user that owns the token making the request. The API token Twist returns on this object is removed.
 *
 * The User object carries `token`, "The user's API token". It is deleted here so a
 * workflow never receives (or logs) the live credential.
 */
type Input = Record<string, never>;

const userGetCurrent: ActionDefinition<Input> = {
  key: "user-get-current",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "Get the user that owns the token making the request. The API token Twist returns on this object is removed.",
  params: [],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(_input, ctx) {
    return twist(ctx, { method: "GET", path: "/users/get_session_user" }).then((user) =>
      omit(user, ["token"])
    );
  },
};

export default userGetCurrent;
