import type { ActionDefinition } from "@w6w/types";
import { VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/users` — the people with a Vanta login.
 *
 * Smaller and different from `person-list`, and the distinction is load-bearing:
 * a *person* is somebody the compliance program covers, a **user** is somebody
 * who can sign in to Vanta.
 *
 * This list is what every ownership field takes. `control-set-owner`,
 * `person-offboard`'s acknowledger, an issue's owner — all user ids, all from
 * here. A workflow that assigns ownership by looking somebody up in
 * `person-list` will find them and then fail, which is a confusing way to
 * discover the difference.
 *
 * It is also an access review in its own right: who can see the compliance
 * program is a question worth asking about a system holding every finding, every
 * exception and every piece of evidence.
 */
const action: ActionDefinition = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Vanta users",
  description:
    "People with a Vanta login — not the same roster as `person-list`. Every ownership field in " +
    "the API takes an id from here.",
  params: [...LIST_PARAMS],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Users returned" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll("/users", {}, want, Math.max(1, Number(p.maxPages ?? 50)));
    ctx.log("info", "read Vanta users", { count: page.items.length });
    return { users: page.items, count: page.items.length, hasNextPage: page.hasNextPage };
  },
};

export default action;
