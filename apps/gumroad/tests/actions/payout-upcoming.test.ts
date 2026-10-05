import { assertEquals, assertRejects } from "@std/assert";
import payoutUpcoming from "../../actions/payout-upcoming.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "includeSales": true, "includeTransactions": true };

Deno.test("payout-upcoming: sends GET /v2/payouts/upcoming with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "payouts": [{ "id": "a" }] } }]);
  await payoutUpcoming.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/payouts/upcoming");
  assertEquals(queryOf(calls[0].url), { "include_sales": "true", "include_transactions": "true" });
  assertEquals(calls[0].body, null);
});

Deno.test("payout-upcoming: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "payouts": [{ "id": "a" }] } }]);
  assertEquals(await payoutUpcoming.execute(INPUT, ctx), { "payouts": [{ "id": "a" }] });
});

Deno.test("payout-upcoming: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(payoutUpcoming.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("payout-upcoming: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(payoutUpcoming.execute(INPUT, ctx)), Error, "refused");
});
