import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  userId: string;
}

const action: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Get one user by id.",
  params: [
    idParam("userId", "User id"),
  ],
  output: [
    { key: "id", type: "string", label: "User id" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "object", label: "Role" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(`/users/${encodeId(input.userId)}`);
  },
};

export default action;
