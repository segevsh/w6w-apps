import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/archive-page.ts";

test("archive-page: PATCHes /pages/{id} with in_trash=true", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "page", id: "page-1", in_trash: true } }]);
  await action.execute({ pageId: "page-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/page-1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { in_trash: true });
});
