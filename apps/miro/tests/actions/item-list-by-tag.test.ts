import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-list-by-tag.ts";

/**
 * The by-tag variant of the items endpoint takes `offset`, not `cursor` — the
 * spec is explicit, and using the wrong pager would silently return one page.
 */
Deno.test("item-list-by-tag: uses the offset pager, unlike the bare items list", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "i1" }], total: 2, size: 1 } },
    { status: 200, body: { data: [{ id: "i2" }], total: 2, size: 1 } },
  ], { display: {} });
  const result = await action.execute!({ boardId: "b1", tagId: "t1", returnAll: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/boards/b1/items");
  assertEquals(url.searchParams.get("tag_id"), "t1");
  assertEquals(new URL(calls[1].url).searchParams.get("offset"), "1");
  assertEquals(result, [{ id: "i1" }, { id: "i2" }]);
});

Deno.test("item-list-by-tag: a tag is required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({ boardId: "b1" }, ctx), Error, "`tagId`");
  assertEquals(calls.length, 0);
});
