import type { ActionDefinition } from "@w6w/types";
import { compact, PylonClient } from "../lib/client.ts";
import { cursorParam, limitParam, PAGE_OUTPUT } from "../lib/params.ts";

interface Input {
  email?: string;
  emails?: string[] | string;
  cursor?: string;
  limit?: number;
}

/**
 * `POST /users/search` — the ONLY filterable field is `email`, with `equals`, `in` or `not_in`. A
 * single email becomes an `equals` filter; several become `in`.
 */
const userSearch: ActionDefinition<Input> = {
  key: "user-search",
  type: "search",
  resource: "user",
  title: "Search Users by Email",
  description:
    "Find users by email address. Email is the only field Pylon lets you filter users on.",
  params: [
    { key: "email", label: "Email", type: "string", hint: "Exact match." },
    {
      key: "emails",
      label: "Emails",
      type: "array",
      item: { type: "string" },
      hint: "Match any of these. Used when Email is empty.",
    },
    cursorParam,
    limitParam(),
  ],
  output: [{ key: "users", type: "array", label: "Users on this page" }, ...PAGE_OUTPUT],

  async execute(input, ctx) {
    const many = typeof input.emails === "string"
      ? input.emails.split(",").map((s) => s.trim()).filter(Boolean)
      : (input.emails ?? []).map((s) => String(s).trim()).filter(Boolean);
    const filter = input.email
      ? { field: "email", operator: "equals", value: input.email }
      : many.length > 0
      ? { field: "email", operator: "in", values: many }
      : undefined;
    const { items, ...page } = await new PylonClient(ctx).list("POST", "/users/search", {
      body: compact({ filter, cursor: input.cursor, limit: input.limit }),
    });
    return { users: items, ...page };
  },
};

export default userSearch;
