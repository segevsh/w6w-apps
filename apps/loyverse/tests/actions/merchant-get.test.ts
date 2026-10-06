import { assertEquals } from "@std/assert";
import action from "../../actions/merchant-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("merchant-get: GET /v1.0/merchant and returns the body as-is", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "m1", business_name: "Cafe", currency: { code: "USD" } },
  }]);
  const out = await action.execute({}, ctx) as { business_name: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/merchant");
  assertEquals(out.business_name, "Cafe");
  assertEquals("authorization" in calls[0].headers, false, "actions never set credentials");
});
