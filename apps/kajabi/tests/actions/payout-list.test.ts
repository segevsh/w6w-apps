import { assertEquals } from "@std/assert";
import payoutList from "../../actions/payout-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("payout-list: GETs the payouts collection with its filters", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "payouts") }]);
  await payoutList.execute({
    siteId: "111",
    status: "paid",
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    pageNumber: 2,
  }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/kajabi_payments_payouts");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[status]"], "paid");
  assertEquals(q["filter[start_date]"], "2026-01-01");
  assertEquals(q["filter[end_date]"], "2026-01-31");
  assertEquals(q["page[number]"], "2");
});

/**
 * Kajabi marks `site_id` *required* on this endpoint specifically — unlike
 * every other collection, where it is merely recommended. Pinned so the param
 * is not "harmonised" into the optional shared `siteFilterParam`.
 */
Deno.test("payout-list: the site filter is required, unlike every other list", () => {
  const site = payoutList.params!.find((p) => p.key === "siteId")!;
  assertEquals(site.required, true);
});

/** The spec declares `page[number]` but neither `page[size]` nor `sort` here. */
Deno.test("payout-list: offers no page size or sort, because the spec declares none", () => {
  const keys = payoutList.params!.map((p) => p.key);
  assertEquals(keys.includes("pageSize"), false);
  assertEquals(keys.includes("sort"), false);
});
