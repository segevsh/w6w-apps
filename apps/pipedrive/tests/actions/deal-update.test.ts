import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deal-update.ts";

Deno.test("deal-update: PUTs /deals/{id} with only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 7 } } }]);
  await action.execute!({ dealId: 7, status: "won", value: 999 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/deals/7");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { status: "won", value: 999 });
});
