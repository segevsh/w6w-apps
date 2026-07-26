import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-get.ts";

Deno.test("board-get: GETs /boards/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "b1" } }]);
  await action.execute({ id: "b1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/1/boards/b1");
});

Deno.test("board-get: percent-encodes the id so it cannot escape the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "b1/../members" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/1/boards/b1%2F..%2Fmembers");
});
