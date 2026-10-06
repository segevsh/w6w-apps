import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/voucher-series-list.ts";

Deno.test("voucher-series-list: GET /3/voucherseries with its query", async () => {
  const reply = { "VoucherSeriesCollection": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ "page": 7, "limit": 7 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://api.fortnox.se");
  assertEquals(url.pathname, "/3/voucherseries");
  assertEquals(Object.fromEntries(url.searchParams), { "page": "7", "limit": "7" });
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);

  // Unset params must never reach the wire as empty query keys.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({} as never, bare.ctx);
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});
