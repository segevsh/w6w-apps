import { assertEquals } from "@std/assert";
import action from "../../actions/site-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("site-create: POST /api/v3/sites with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 8 } }]);
  const out = await action.execute(
    { "name": "HQ", "zipCode": "33431", "country": "US", "customerId": 10 } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/sites");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), {
    "name": "HQ",
    "zip_code": "33431",
    "country": "US",
    "customer_id": 10,
  });
  assertEquals(out, { "id": 8 });
});
