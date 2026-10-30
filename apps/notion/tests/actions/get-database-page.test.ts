import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-database-page.ts";

test("get-database-page: GETs /pages/{id}", async () => {
  const body = { object: "page", id: "page-1" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute({ pageId: "page-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/page-1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
