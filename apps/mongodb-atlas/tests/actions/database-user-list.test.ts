import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/database-user-list.ts";

const page = {
  status: 200,
  body: {
    results: [
      { username: "app", databaseName: "admin", roles: [], scopes: [{ name: "prod" }] },
      { username: "analytics", databaseName: "admin", roles: [], scopes: [] },
    ],
    totalCount: 2,
  },
};

Deno.test("database-user-list: reads the project's database users", async () => {
  const { ctx, calls } = mockCtx([page]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/databaseUsers",
  );
  assertEquals(result.usernames, ["app", "analytics"]);
  assertEquals(result.totalCount, 2);
});

/** No scopes means every cluster in the project, including future ones. */
Deno.test("database-user-list: counts the users that can reach every cluster", async () => {
  const { ctx, logs } = mockCtx([page]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.unscopedCount, 1);
  assertEquals(logs[0].data, { count: 2, unscopedCount: 1 });
  assert(/EVERY cluster in the project/.test(action.description!), action.description);
});

Deno.test("database-user-list: a user with no scopes field counts as unscoped", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [{ username: "x" }] } }]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.unscopedCount, 1);
});

/** These are database credentials, not Atlas accounts. */
Deno.test("database-user-list: says what these are not", () => {
  assert(/not Atlas accounts/.test(action.description!), action.description);
  assertEquals(action.resource, "database-user");
});

Deno.test("database-user-list: a project with no users is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [] } }]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.count, 0);
  assertEquals(result.unscopedCount, 0);
});
