import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/api-key-list.ts";

Deno.test("api-key-list: lists keys without their secrets", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { object: "list", has_more: false, data: [{ id: "k_1", name: "prod" }] },
  }], { display: {} });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api-keys");
  assertEquals(result, [{ id: "k_1", name: "prod" }]);
});
