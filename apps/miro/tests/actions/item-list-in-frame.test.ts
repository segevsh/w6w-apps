import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-list-in-frame.ts";

/** The spec's {board_id_PlatformContainers} is the same items URL. */
Deno.test("item-list-in-frame: same path, scoped by parent_item_id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "i1" }] } }], {
    display: {},
  });
  await action.execute!({ boardId: "b1", frameId: "f1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/boards/b1/items");
  assertEquals(url.searchParams.get("parent_item_id"), "f1");
});

Deno.test("item-list-in-frame: both ids are required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ boardId: "b1" }, ctx),
    Error,
    "`frameId`",
  );
  assertEquals(calls.length, 0);
});
