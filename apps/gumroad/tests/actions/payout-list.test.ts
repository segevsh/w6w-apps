import { assertEquals, assertRejects } from "@std/assert";
import payoutList from "../../actions/payout-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "after": "after-1",
  "before": "before-1",
  "includeUpcoming": true,
  "pageKey": "pageKey-1",
};

Deno.test("payout-list: sends GET /v2/payouts with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "payouts": [{ "id": "a" }], "next_page_key": "nk-1" },
  }]);
  await payoutList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/payouts");
  assertEquals(queryOf(calls[0].url), {
    "after": "after-1",
    "before": "before-1",
    "include_upcoming": "true",
    "page_key": "pageKey-1",
  });
  assertEquals(calls[0].body, null);
});

Deno.test("payout-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "payouts": [{ "id": "a" }], "next_page_key": "nk-1" },
  }]);
  assertEquals(await payoutList.execute(INPUT, ctx), {
    "payouts": [{ "id": "a" }],
    "nextPageKey": "nk-1",
  });
});

Deno.test("payout-list: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(payoutList.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("payout-list: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(payoutList.execute(INPUT, ctx)), Error, "refused");
});
