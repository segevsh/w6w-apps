import { assertEquals } from "@std/assert";
import action from "../../actions/customer-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-get: GET /api/v3/customers/10 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 10 } }]);
  const out = await action.execute({ "customerId": 10 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/customers/10");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 10 });
});
