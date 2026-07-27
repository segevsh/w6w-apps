import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deal-delete.ts";

Deno.test("deal-delete: DELETEs /deals/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 7 } } }]);
  await action.execute!({ dealId: 7 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/deals/7");
  assertEquals(calls[0].method, "DELETE");
});
