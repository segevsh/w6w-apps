import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { providerOptions } from "../lib/users.ts";

interface Input {
  id: string;
  provider?: string;
}

/**
 * `GET /users/{id}` — a single User.
 *
 * `id` accepts either Thinkific's own numeric id, or an External ID (a string
 * from your own SSO/OpenID Connect system) — but the External ID form only
 * resolves when `provider` is also given, per the OpenAPI parameter
 * description. Both forms are exposed here rather than only the numeric one.
 */
const usersGet: ActionDefinition<Input> = {
  key: "users-get",
  type: "read",
  resource: "users",
  title: "Get User",
  description: "Fetch a single User by Thinkific ID, or by External ID + provider.",
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
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "roles", type: "array", label: "Roles" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    // `provider` is a bare query param here — unlike the LIST endpoints'
    // `query[...]`-namespaced filters, this one is a single-resource lookup
    // parameter and the OpenAPI document names it plainly.
    return await new ThinkificClient(ctx).json(
      `/users/${encodeURIComponent(input.id)}`,
      { query: { provider: input.provider } },
    );
  },
};

export default usersGet;
