import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/** Fetch one team account with its portal role, content roles and group memberships. */
interface Input {
  projectId?: string;
  userId: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Team Account",
  description: "Fetch one team account with its portal role, content roles and group memberships.",
  params: [projectIdParam, { key: "userId", label: "User ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data("GET", c.projectPath(input.projectId, `/users/${encodeId(input.userId)}`));
  },
};

export default userGet;
