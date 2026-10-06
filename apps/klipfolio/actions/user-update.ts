import type { ActionDefinition } from "@w6w/types";
import { compact, KlipfolioClient, okResult, seg } from "../lib/client.ts";

interface Input {
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  external_id?: string;
  client_id?: string;
}

/** `PUT /users/{user_id}`. */
const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update a user; only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "user_id", label: "User ID", type: "string", required: true },
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    {
      key: "external_id",
      label: "External ID",
      type: "string",
      hint: "Your own identifier for the user.",
    },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "op", type: "string", label: "Operation echoed back, when the API reports one" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("PUT", `/users/${seg(input.user_id)}`, {
      query: { client_id: input.client_id },
      body: compact({
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        external_id: input.external_id,
      }),
    });
    return okResult(env);
  },
};

export default userUpdate;
