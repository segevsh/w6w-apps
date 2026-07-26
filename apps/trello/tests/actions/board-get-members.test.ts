import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-get-members.ts";

Deno.test("board-get-members: GETs /boards/{id}/members", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "m1" }] }]);
  assertEquals(await action.execute({ id: "b1" }, ctx), [{ id: "m1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/1/boards/b1/members");
});
