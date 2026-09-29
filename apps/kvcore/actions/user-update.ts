import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";
import { userBody, userFields } from "../lib/params.ts";

interface Input extends Record<string, unknown> {
  user_id: string;
}

/** `PUT /v2/public/user/{user_id}` — update an existing user's profile. */
const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update fields on an existing user. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "user_id", label: "User ID", type: "string", required: true },
    ...userFields({ create: false }),
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const { user_id, ...fields } = input;
    return await new KvCoreClient(ctx).json(`/user/${encodeURIComponent(user_id)}`, {
      method: "PUT",
      body: userBody(fields),
    });
  },
};

export default userUpdate;
