import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { seg } from "../lib/params.ts";

/** `GET /v1/users/{userId}` (operationId `getUserById`); an unknown id is a documented 404. */
interface Input {
  userId: string;
}

export const userOutput = [
  { key: "id", type: "string" as const, label: "User id" },
  { key: "displayName", type: "string" as const, label: "Display name" },
  { key: "email", type: "string" as const, label: "Email" },
  { key: "organizationRole", type: "string" as const, label: "Role in the organization" },
  { key: "isGuest", type: "boolean" as const, label: "Whether the user is a guest" },
  { key: "archivedAt", type: "string" as const, label: "Archived at, or null" },
];

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Return a user by id.",
  params: [{ key: "userId", label: "User ID", type: "string", required: true }],
  output: userOutput,

  execute(input, ctx) {
    return new SliteClient(ctx).get(`/users/${seg(input.userId, "userId")}`);
  },
};

export default userGet;
