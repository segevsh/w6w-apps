import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/section-get-many.ts";

test("section-get-many: GETs /sections scoped by project_id", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({ projectId: "p1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/sections");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("project_id"), "p1");
});

test("section-get-many: omits project_id when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("project_id"), false);
});
