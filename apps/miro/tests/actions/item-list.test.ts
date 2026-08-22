import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-list.ts";

Deno.test("item-list: uses the CURSOR pager and the real board path", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "i1" }], cursor: "c2" } },
    { status: 200, body: { data: [{ id: "i2" }] } },
  ], { display: {} });
  const result = await action.execute!({ boardId: "b1", returnAll: true }, ctx);
  // Not {board_id_Platform…} — that is a spec artifact.
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/items");
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "c2");
  assertEquals(result, [{ id: "i1" }, { id: "i2" }]);
});

Deno.test("item-list: the type filter reaches the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], { display: {} });
  await action.execute!({ boardId: "b1", type: "sticky_note" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "sticky_note");
});

Deno.test("item-list: a blank board fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`boardId`");
  assertEquals(calls.length, 0);
});
