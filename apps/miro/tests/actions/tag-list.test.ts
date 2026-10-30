import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-list.ts";

test("tag-list: offset-paginated", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "t1" }], total: 1 } }], {
    display: {},
  });
  const result = await action.execute!({ boardId: "b1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/tags");
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "0");
  assertEquals(result, [{ id: "t1" }]);
});
