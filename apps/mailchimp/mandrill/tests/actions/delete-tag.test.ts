import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-tag.ts";

test("delete-tag: POSTs /tags/delete.json with the tag name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tag: "welcome" } }]);
  await action.execute!({ tag: "welcome" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/tags/delete.json");
  assertEquals(JSON.parse(calls[0].body!), { tag: "welcome" });
});
