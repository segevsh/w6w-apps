import type { ActionDefinition } from "@w6w/types";
import { one } from "../lib/client.ts";
import {} from "../lib/params.ts";

/**
 * `GET /users/me` (Mural public API v1). OAuth scope: `identity:read`.
 */
type Input = Record<string, never>;

const currentUserGet: ActionDefinition<Input> = {
  key: "current-user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "Return the authenticated Mural user (id, name, email, last active workspace). Needs the `identity:read` OAuth scope.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "lastActiveWorkspace", type: "string", label: "Last active workspace ID" },
  ],

  execute(_input, ctx) {
    return one(ctx, "GET", `/users/me`);
  },
};

export default currentUserGet;
