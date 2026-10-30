import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-update.ts";

test("group-update: PATCHes only the fields supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ groupKey: "g-1", description: "Updated" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/groups/g-1");
  assertEquals(JSON.parse(calls[0].body!), { description: "Updated" });
});
