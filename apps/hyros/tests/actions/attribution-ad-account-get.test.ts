import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/attribution-ad-account-get.ts";

Deno.test("attribution-ad-account-get: GET /attribution/ad-account", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [{ id: "acct" }] } }]);
  const out = await action.execute({
    attributionModel: "scientific",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    fields: "revenue,cost",
    ids: "acct",
    currency: "usd",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/attribution/ad-account");
  assertEquals(queryOf(calls[0].url).currency, "usd");
  assertEquals(queryOf(calls[0].url).ids, "acct");
  assertEquals(out, { result: [{ id: "acct" }] });
});
