import { assertEquals } from "@std/assert";
import databaseGet from "../../actions/database-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("database-get: calls GET /databases/{databaseId}", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ id: "db1", name: "CRM", workspaceId: "w1" }),
  }]);
  const out = await databaseGet.execute({ databaseId: "db1" }, ctx) as { id: string };

  assertEquals(pathOf(calls[0].url), "/api/v1/databases/db1");
  assertEquals(out.id, "db1");
});

Deno.test("database-get: the database id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "a/b" }) }]);
  await databaseGet.execute({ databaseId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/databases/a%2Fb");
});
