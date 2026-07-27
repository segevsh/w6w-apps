import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deal-get.ts";

Deno.test("deal-get: GETs /deals/{id}", async () => {
  const body = { success: true, data: { id: 42 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ dealId: 42 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/deals/42");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
