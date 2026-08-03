import { assertEquals } from "@std/assert";
import purchaseList from "../../actions/purchase-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("purchase-list: maps the documented filters", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "purchases") }]);
  await purchaseList.execute({
    siteId: "111",
    customerId: "456",
    active: true,
    deactivated: false,
    couponCode: "SAVE10",
    referrer: "partner",
    sort: "-created_at",
  }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/purchases");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[customer_id]"], "456");
  assertEquals(q["filter[active]"], "true");
  assertEquals(q["filter[coupon_code_eq]"], "SAVE10");
  assertEquals(q["sort"], "-created_at");
});

/**
 * `filter[active]` and `filter[deactivated]` are two independent booleans in
 * Kajabi's spec, not one enum — so `false` must reach the wire rather than
 * being dropped as "unset". Collapsing them would assert they partition the
 * set, which the spec never says.
 */
Deno.test("purchase-list: a false boolean filter is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "purchases") }]);
  await purchaseList.execute({ deactivated: false }, ctx);
  assertEquals(queryOf(calls[0])["filter[deactivated]"], "false");
});

/**
 * Kajabi's spec declares the parameter as `filter[referrer]` while its own
 * example reads `filter[referrer_cont]`. The declared name wins — it is the
 * generated half of the document.
 */
Deno.test("purchase-list: sends the declared referrer parameter name", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "purchases") }]);
  await purchaseList.execute({ referrer: "partner" }, ctx);
  const q = queryOf(calls[0]);
  assertEquals(q["filter[referrer]"], "partner");
  assertEquals(q["filter[referrer_cont]"], undefined);
});

Deno.test("purchase-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "purchases") }]);
  await purchaseList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
