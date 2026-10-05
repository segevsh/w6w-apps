import { assertEquals, assertRejects } from "@std/assert";
import payoutGet from "../../actions/payout-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "payoutId": "payoutId-1==", "includeSales": true, "includeTransactions": true };

Deno.test("payout-get: sends GET /v2/payouts/payoutId-1%3D%3D with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "payout": { "id": "x1", "marker": true } },
  }]);
  await payoutGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/payouts/payoutId-1%3D%3D");
  assertEquals(queryOf(calls[0].url), { "include_sales": "true", "include_transactions": "true" });
  assertEquals(calls[0].body, null);
});

Deno.test("payout-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "payout": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await payoutGet.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("payout-get: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(payoutGet.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("payout-get: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(payoutGet.execute(INPUT, ctx)), Error, "refused");
});
