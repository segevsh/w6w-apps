import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient } from "../lib/client.ts";

/**
 * `GET /v1/users/` — List the users of the account (username, name, country, phone, picture).
 */
interface Input {
  page?: number;
}

const userList: ActionDefinition<Input, unknown> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List the users of the account (username, name, country, phone, picture).",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based page number; Clientify returns at most 100 results per page.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "count", type: "number", label: "Total matches" },
    { key: "next", type: "string", label: "URL of the next page, or null" },
    { key: "previous", type: "string", label: "URL of the previous page, or null" },
    { key: "results", type: "array", label: "Records on this page" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/users/`, { method: "GET", query: { "page": input.page } });
  },
};

export default userList;
