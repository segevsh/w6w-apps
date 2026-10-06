import { assertEquals } from "@std/assert";
import payoutList from "../../actions/payout-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("payout-list: GET /v2/payouts with include and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await payoutList.execute({ include: "transactions", per_page: 25 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/payouts");
  assertEquals(queryOf(calls[0].url), { include: "transactions", per_page: "25" });
});
