import type { ActionDefinition } from "@w6w/types";
import { compact, createdResult, KlipfolioClient, strList } from "../lib/client.ts";

interface Input {
  first_name: string;
  last_name: string;
  email: string;
  roles: unknown;
  password?: string;
  external_id?: string;
  send_email?: boolean;
  client_id?: string;
}

/** `POST /users`. */
const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Create a user; the new ID comes back in `id`.",
  idempotent: false,
  params: [
    { key: "first_name", label: "First name", type: "string", required: true },
    { key: "last_name", label: "Last name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "roles",
      label: "Role IDs",
      type: "text",
      required: true,
      hint: "Comma-separated role IDs to assign.",
    },
    { key: "password", label: "Password", type: "secret", hint: "Optional initial password." },
    { key: "external_id", label: "External ID", type: "string" },
    {
      key: "send_email",
      label: "Send welcome email",
      type: "boolean",
      hint: "Send the new user a welcome email (default false).",
    },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "New resource ID" },
    { key: "location", type: "string", label: "Location path of the new resource" },
    {
      key: "instance_location",
      type: "string",
      label: "Location of the new data source instance (data sources only)",
    },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("POST", `/users`, {
      query: { send_email: input.send_email },
      body: compact({
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        roles: strList(input.roles),
        password: input.password,
        external_id: input.external_id,
        client_id: input.client_id,
      }),
    });
    return createdResult(env);
  },
};

export default userCreate;
