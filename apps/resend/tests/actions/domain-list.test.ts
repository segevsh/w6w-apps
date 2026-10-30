import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/domain-list.ts";

test("domain-list: returns the flattened rows", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { object: "list", has_more: false, data: [{ id: "d_1", status: "verified" }] },
  }], { display: {} });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/domains");
  assertEquals(result, [{ id: "d_1", status: "verified" }]);
});
