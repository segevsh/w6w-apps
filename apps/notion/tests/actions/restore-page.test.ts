import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/restore-page.ts";

test("restore-page: PATCHes /pages/{id} with in_trash=false", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "page", id: "page-1", in_trash: false } }]);
  await action.execute({ pageId: "page-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/page-1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { in_trash: false });
});
