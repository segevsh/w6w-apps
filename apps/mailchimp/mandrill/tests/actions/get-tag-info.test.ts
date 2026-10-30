import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-tag-info.ts";

test("get-tag-info: POSTs /tags/info.json with the tag name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tag: "welcome", sent: 12 } }]);
  await action.execute!({ tag: "welcome" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/tags/info.json");
  assertEquals(JSON.parse(calls[0].body!), { tag: "welcome" });
});
