import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-database.ts";

test("get-database: GETs /databases/{id}", async () => {
  const body = { object: "database", id: "db-1" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute({ databaseId: "db-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/databases/db-1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
