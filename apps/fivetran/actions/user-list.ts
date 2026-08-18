import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/users` — who can reach the pipelines.
 *
 * An access review over the system that holds credentials for every source a
 * company syncs — a CRM, a payment processor, a production database. Fivetran
 * itself is therefore one of the higher-value accounts in most organisations,
 * and one of the least reviewed.
 *
 * Two fields carry the weight. **`role`** decides what somebody can do, and
 * Account Administrator can create and delete connections and see every
 * destination's configuration. **`invited`** with no `logged_in_at` is somebody
 * who was granted access and never used it — a standing grant nobody is
 * tracking.
 *
 * This action separates both rather than making a caller read a list of people.
 */
const action: ActionDefinition = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List users",
  description:
    "Who can reach the pipelines — an access review over the system holding credentials for " +
    "every source a company syncs, and one of the least reviewed accounts anywhere.",
  params: [...LIST_PARAMS],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Users returned" },
    { key: "admins", type: "number", label: "How many hold an administrator role" },
    { key: "neverLoggedIn", type: "number", label: "Invited and never used — standing grants" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new FivetranClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll<{ role?: string; logged_in_at?: string | null }>(
      "/v1/users",
      {},
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );

    const admins = page.items.filter((u) => /admin/i.test(String(u?.role ?? ""))).length;
    const neverLoggedIn = page.items.filter((u) => !u?.logged_in_at).length;

    // Counts, never the roster.
    ctx.log("info", "read Fivetran users", { count: page.items.length, admins });
    return { users: page.items, count: page.items.length, admins, neverLoggedIn };
  },
};

export default action;
