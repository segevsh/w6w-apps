import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/connector-list.ts";

test("connector-list: cursor-paginated, like the items collection", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "c1" }], cursor: "c2" } },
    { status: 200, body: { data: [{ id: "c2" }] } },
  ], { display: {} });
  const result = await action.execute!({ boardId: "b1", returnAll: true }, ctx) as unknown[];
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/connectors");
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "c2");
  assertEquals(result.length, 2);
});
