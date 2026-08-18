import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `POST /user.list` — the people who work here, as Ashby knows them.
 *
 * Two things need this. Attribution — `creditedToUserId` on a candidate or
 * application is a user id, and turning "credit this to Ada" into an id starts
 * here. And matching: an Ashby user's email is what links them to the same
 * person in Slack, an HRIS or a directory, which is how a workflow notifies the
 * right hiring manager.
 *
 * **Deactivated users are excluded by default**, and that is the right default
 * for assignment — nobody should be credited with a referral if they have left.
 * It is the wrong default for historical data: an application credited to
 * somebody who has since gone still names them, and resolving that id needs
 * them included.
 */
const action: ActionDefinition = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List users",
  description:
    "Ashby users, for attribution and for matching a hiring manager to their account elsewhere. " +
    "Deactivated users are excluded by default — include them to resolve historical credits.",
  params: [
    {
      key: "includeDeactivated",
      label: "Include Deactivated",
      type: "boolean",
      default: false,
      hint: "Needed to resolve a credit on an old application whose owner has since left.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Users returned" },
    { key: "syncToken", type: "string", label: "Store this and pass it next run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new AshbyClient(ctx);
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll(
      "user.list",
      compact({
        syncToken: p.syncToken,
        includeDeactivated: p.includeDeactivated === true ? true : undefined,
      }),
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    ctx.log("info", "read Ashby users", { count: page.items.length });
    return { users: page.items, count: page.items.length, syncToken: page.syncToken };
  },
};

export default action;
