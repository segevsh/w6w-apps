import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-add-member.ts";

Deno.test("board-add-member: PUTs the member route with the role", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "b1" } }]);
  await action.execute({ id: "b1", idMember: "m1", type: "admin" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/1/boards/b1/members/m1");
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "admin");
});
