import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { providerOptions } from "../lib/users.ts";

interface Input {
  id: string;
  provider?: string;
}

/** `DELETE /users/{id}` — permanently delete a User. Returns 204 with no body. */
const usersDelete: ActionDefinition<Input> = {
  key: "users-delete",
  type: "perform",
  resource: "users",
  title: "Delete User",
  description: "Permanently delete a User from this Site. This cannot be undone.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "User ID",
      type: "string",
      required: true,
      hint: "A Thinkific numeric User ID, or an External ID (requires Provider below).",
    },
    {
      key: "provider",
      label: "Provider",
      type: "select",
      options: providerOptions,
      hint: "Required only when ID above is an External ID rather than a Thinkific ID.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const status = await new ThinkificClient(ctx).status(
      `/users/${encodeURIComponent(input.id)}`,
      { method: "DELETE", query: { provider: input.provider } },
    );
    return { status };
  },
};

export default usersDelete;
