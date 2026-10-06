import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { seg } from "../lib/params.ts";

/** `GET /v1/users/{uuid}/` — one user. */
interface Input {
  userUuid: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one Avoma user by UUID.",
  params: [{ key: "userUuid", label: "User UUID", type: "string", required: true }],
  output: [
    { key: "uuid", type: "string", label: "User UUID" },
    { key: "user", type: "object", label: "Profile (email, first_name, last_name, …)" },
    { key: "role", type: "object", label: "Role" },
    { key: "is_admin", type: "boolean", label: "Is admin" },
    { key: "status", type: "string", label: "Status" },
    { key: "teams", type: "string", label: "Teams" },
    { key: "position", type: "string", label: "Position" },
  ],

  execute(input, ctx) {
    return new AvomaClient(ctx).get(`/v1/users/${seg(input.userUuid, "userUuid")}/`);
  },
};

export default userGet;
