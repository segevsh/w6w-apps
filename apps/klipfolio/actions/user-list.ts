import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, listResult } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  email?: string;
  external_id?: string;
  include_roles?: boolean;
  include_groups?: boolean;
  client_id?: string;
}

/** `GET /users`. */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List users",
  description: "List the users the API key can access, paged with limit and offset.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Page size, 1-100 (default 25).",
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint: "Index of the first result (default 0).",
      validation: { min: 0, integer: true },
    },
    { key: "email", label: "Email", type: "string", hint: "Find a user by email address." },
    {
      key: "external_id",
      label: "External ID",
      type: "string",
      hint: "Only users with this external id.",
    },
    { key: "include_roles", label: "Include roles", type: "boolean" },
    { key: "include_groups", label: "Include groups", type: "boolean" },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Result rows" },
    { key: "count", type: "number", label: "Rows in this page" },
    { key: "total", type: "number", label: "Total rows" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("GET", `/users`, {
      query: {
        limit: input.limit,
        offset: input.offset,
        email: input.email,
        external_id: input.external_id,
        include_roles: input.include_roles,
        include_groups: input.include_groups,
        client_id: input.client_id,
      },
    });
    return listResult(env);
  },
};

export default userList;
