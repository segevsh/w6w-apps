import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-list.ts";

test("email-list: pages with the cursor and returns the flattened rows", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { object: "list", has_more: true, data: [{ id: "e1" }] } },
    { status: 200, body: { object: "list", has_more: false, data: [{ id: "e2" }] } },
  ], { display: {} });
  assertEquals(await action.execute!({ returnAll: true }, ctx), [{ id: "e1" }, { id: "e2" }]);
  assertEquals(new URL(calls[1].url).searchParams.get("after"), "e1");
});
