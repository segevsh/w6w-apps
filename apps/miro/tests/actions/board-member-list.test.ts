import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-member-list.ts";

Deno.test("board-member-list: offset-paginated", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "m1", role: "editor" }], total: 1 },
  }], { display: {} });
  const result = await action.execute!({ boardId: "b1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/members");
  assertEquals(result, [{ id: "m1", role: "editor" }]);
});
