import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, recordResult, seg } from "../lib/client.ts";

interface Input {
  user_id: string;
  full?: boolean;
  client_id?: string;
}

/** `GET /users/{user_id}`. */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Get one user by ID.",
  params: [
    { key: "user_id", label: "User ID", type: "string", required: true },
    {
      key: "full",
      label: "Include associations",
      type: "boolean",
      hint: "Include associations (tab_instances, groups, roles, properties).",
    },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "external_id", type: "string", label: "External ID" },
    { key: "date_last_login", type: "string", label: "Last login (UTC)" },
    { key: "is_locked_out", type: "boolean", label: "Whether the user is locked out" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("GET", `/users/${seg(input.user_id)}`, {
      query: { full: input.full, client_id: input.client_id },
    });
    return recordResult(env);
  },
};

export default userGet;
