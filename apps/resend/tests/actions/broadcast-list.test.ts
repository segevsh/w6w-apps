import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/broadcast-list.ts";

Deno.test("broadcast-list: returns the flattened rows", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { object: "list", has_more: false, data: [{ id: "b_1", status: "draft" }] },
  }], { display: {} });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/broadcasts");
  assertEquals(result, [{ id: "b_1", status: "draft" }]);
});
