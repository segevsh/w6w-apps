import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-attach.ts";

/** The tag is a query param and there is no body — Miro answers 204. */
Deno.test("tag-attach: POSTs the item path with tag_id as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display: {} });
  const result = await action.execute!({ boardId: "b1", itemId: "i1", tagId: "t1" }, ctx);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/boards/b1/items/i1");
  assertEquals(url.searchParams.get("tag_id"), "t1");
  assertEquals(calls[0].body, null);
  assertEquals(result, { itemId: "i1", tagId: "t1", attached: true });
});

Deno.test("tag-attach: all three ids are required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ boardId: "b1", itemId: "i1" }, ctx),
    Error,
    "`tagId`",
  );
  assertEquals(calls.length, 0);
});
