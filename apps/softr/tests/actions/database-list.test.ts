import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import databaseList from "../../actions/database-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("database-list: calls GET /databases and returns the data array", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [{ id: "db1", name: "CRM", workspaceId: "w1", tablesCount: 3 }] } },
  ]);
  const out = await databaseList.execute({}, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/databases");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.data.length, 1);
});

test("database-list: an empty databases list is not an error", async () => {
  const { ctx } = mockCtx([{ body: { data: [] } }]);
  const out = await databaseList.execute({}, ctx) as { data: unknown[] };
  assertEquals(out.data, []);
});
