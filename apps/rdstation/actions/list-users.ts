import type { ActionDefinition } from "@w6w/types";

import { API_BASE, applyQuery, sendJson } from "../lib/client.ts";

/**
 * `GET /users` — the CRM's users (its `users` are the seats a deal can be
 * assigned to).
 *
 * The only documented filter is `active`, and it is three-valued in the same way
 * `win` is on the deal list: `true` for enabled users, `false` for disabled ones,
 * and nothing for "do not filter". The param is a boolean, so a `false` really is
 * sent (`active=false`) rather than dropped as falsy.
 *
 * The response is `{ users: [ … ] }` — a single-key envelope with **no**
 * `has_more`/`total`, so this list cannot be paged beyond what the API returns.
 * It is handed back verbatim.
 */
interface Input {
  active?: boolean;
}

const listUsers: ActionDefinition<Input> = {
  key: "list-users",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List the CRM's users, optionally filtered by enabled/disabled state.",
  params: [
    {
      key: "active",
      label: "Active only",
      type: "boolean",
      hint: "Set to list only enabled users; unset to receive both. A disabled user's `id` still " +
        "works on historical records.",
    },
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
  ],

  execute(input, ctx) {
    const url = new URL(`${API_BASE}/users`);
    applyQuery(url, { active: input.active });
    return sendJson(ctx, url);
  },
};

export default listUsers;
