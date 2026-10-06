import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/voucher-get.ts";

Deno.test("voucher-get: GET /3/vouchers/{voucherSeries}/{voucherNumber} with its query", async () => {
  const reply = { "Voucher": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({
    "voucherSeries": "voucherSeries-v",
    "voucherNumber": 7,
    "financialYear": "financialYear-v",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://api.fortnox.se");
  assertEquals(url.pathname, "/3/vouchers/voucherSeries-v/7");
  assertEquals(Object.fromEntries(url.searchParams), { "financialyear": "financialYear-v" });
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);

  // Unset params must never reach the wire as empty query keys.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!(
    { "voucherSeries": "voucherSeries-v", "voucherNumber": 7 } as never,
    bare.ctx,
  );
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});
