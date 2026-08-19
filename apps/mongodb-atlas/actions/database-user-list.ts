import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, projectId, query } from "../lib/client.ts";
import { PAGE_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /api/atlas/v2/groups/{groupId}/databaseUsers` — who may connect.
 *
 * ## These are not Atlas accounts
 *
 * A database user is a credential for the **database**, used by an
 * application's driver. It is unrelated to the Atlas users and service
 * accounts that hold API access — different objects, different permissions,
 * different place in the console. Confusing the two is why "I have admin in
 * Atlas" does not let you connect to a cluster.
 *
 * ## `databaseName` is `admin` and is part of the identity
 *
 * A user is identified by **username plus authentication database**, and for
 * password users that database is `admin` — not the database they will read.
 * Two users with the same name in different auth databases are two users, and
 * the delete path takes both.
 *
 * ## Passwords are never returned
 *
 * They are write-only. A read-modify-write across users therefore cannot
 * preserve them, which is why `database-user-create` treats an update without
 * a password as a rotation rather than a no-op.
 *
 * ## `scopes` is what stops a user reaching every cluster
 *
 * Left empty, a database user can authenticate against **every cluster in the
 * project**, present and future. That is the default and it is rarely what was
 * meant, so this action counts the unscoped ones.
 */
const action: ActionDefinition = {
  key: "database-user-list",
  type: "read",
  resource: "database-user",
  title: "List database users",
  description:
    "The credentials applications connect with — not Atlas accounts. A user with no `scopes` " +
    "can reach EVERY cluster in the project, present and future, which is the default.",
  params: [PROJECT_PARAM, ...PAGE_PARAMS],
  output: [
    { key: "users", type: "array", label: "The database users" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "usernames", type: "array", label: "Just the usernames" },
    { key: "unscopedCount", type: "number", label: "How many can reach every cluster" },
    { key: "totalCount", type: "number", label: "Across all pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);

    const { results, totalCount } = await new AtlasClient(ctx).list<{
      username?: string;
      databaseName?: string;
      roles?: unknown[];
      scopes?: unknown[];
    }>(`/api/atlas/v2/groups/${id}/databaseUsers`, {
      query: query({
        itemsPerPage: Math.min(500, Math.max(1, Number(p.itemsPerPage ?? 100))),
        pageNum: Math.max(1, Number(p.pageNum ?? 1)),
      }),
    });

    const unscopedCount = results.filter((user) => !(user?.scopes ?? []).length).length;

    // Usernames are identities, not secrets — but the count is what matters here.
    ctx.log("info", "listed Atlas database users", {
      count: results.length,
      unscopedCount,
    });

    return {
      users: results,
      count: results.length,
      usernames: results.map((user) => user?.username).filter(Boolean),
      unscopedCount,
      totalCount,
    };
  },
};

export default action;
